var express = require('express');
const axios = require('axios');
var router = express.Router();
const mysql = require('mysql2/promise');
const config = require('../conf/config');

// 미세먼지 API
const API_URL = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc";
const API_KEY = "NirKOUIgxxTRm0PmhS9WJnW2RBIE2%2BntU%2BWVYVvr79ZpxbIF99YHK%2B9M6oskOYOpIx9z8VHxKPKPEa1iRPxGLw%3D%3D";
const MAX_ROWS = 10000; // 가능한 최대 행 수

// 대상 지역명 리스트
const sidoNames = [
    '전국', '서울', '부산', '대구', '인천', '광주', '대전', '울산', '경기', '강원',
    '충북', '충남', '전북', '전남', '경북', '경남', '제주', '세종'
];

// 데이터베이스 연결 생성
async function createConnection() {
    return await mysql.createConnection({
        host: config.DB_HOST,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        database: config.DB_DATABASE,
        port: config.DB_PORT
    });
}

// 특정 지역의 데이터를 가져와 DB에 저장하는 함수
async function fetchAndStoreAirQualityForRegion(connection, sidoName) {
    let pageNo = 1;
    let allData = [];

    try {
        while (true) {
            const response = await axios.get(API_URL, {
                params: {
                    serviceKey: API_KEY,
                    returnType: 'json',
                    numOfRows: MAX_ROWS,
                    pageNo,
                    sidoName,
                    ver: '1.0'
                }
            });

            const data = response.data.response.body.items;
            if (!data) break; // 데이터가 없으면 중단
            allData = allData.concat(data); // 데이터를 누적

            // 데이터베이스에 데이터 저장
            for (const item of data) {
                const { sidoName, stationName, dataTime, pm10Value, pm25Value, khaiValue } = item;

                // 데이터 삽입 또는 업데이트
                await connection.execute(
                    `INSERT INTO Info (sidoName, stationName, dataTime, pm10Value, pm25Value, khaiValue) 
                     VALUES (?, ?, ?, ?, ?, ?)
                     ON DUPLICATE KEY UPDATE 
                     pm10Value = VALUES(pm10Value), 
                     pm25Value = VALUES(pm25Value), 
                     khaiValue = VALUES(khaiValue)`,
                    [sidoName, stationName, dataTime, pm10Value, pm25Value, khaiValue]
                );
            }

            // 전체 페이지를 다 불러왔는지 확인
            if (data.length < MAX_ROWS) break;
            pageNo += 1; // 다음 페이지로 이동
        }
        console.log(`${sidoName} 지역의 데이터가 성공적으로 저장되었습니다.`);
    } catch (error) {
        console.error(`${sidoName} 지역의 데이터 저장 중 오류 발생:`, error.message);
    }
}

// 모든 지역의 데이터를 주기적으로 가져와서 DB에 저장하는 함수
async function fetchAndStoreAirQualityData() {
    try {
        const connection = await createConnection();

        // 기존 데이터 삭제
        await connection.execute('DELETE FROM Info');

        // 모든 지역의 데이터를 가져와서 DB에 저장
        for (const sidoName of sidoNames) {
            await fetchAndStoreAirQualityForRegion(connection, sidoName);
        }

        await connection.end();
        console.log("모든 지역의 대기질 데이터가 성공적으로 업데이트되었습니다.");
    } catch (error) {
        console.error("전체 데이터 저장 중 오류 발생:", error.message);
    }
}

// 초기 데이터 로드 및 30분마다 반복
fetchAndStoreAirQualityData(); // 서버 시작 시 한 번 실행
setInterval(fetchAndStoreAirQualityData, 30 * 60 * 1000); // 30분마다 데이터 업데이트

module.exports = router;
