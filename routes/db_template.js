var express = require('express');
const axios = require('axios');
var router = express.Router();
const mysql = require('mysql2/promise');
const config = require('../conf/config');

// 미세먼지 API 정보
const API_URL = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getMinuDustFrcstDspth";  
const API_KEY = "DlF6e52nwcUoyTvV2SKdU8khO2Pcc7VeX8Vn6FmwaaLGg0g0QlP3NiJi8FTn99tj6iWvCU5oorgGpa61n4m3Cw%3D%3D"; // 실제 서비스 키로 교체
const MAX_ROWS = 10000; // 페이지당 최대 행 수 (최대 100개로 제한)

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

// 오늘 날짜를 'YYYY-MM-DD' 형식으로 반환하는 함수
function getTodayDate() {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// 전국 데이터 불러와 DB에 저장하는 함수
async function fetchAndStoreAirQualityData() {
    const searchDate = getTodayDate(); // 오늘 날짜로 설정
    const informCode = 'PM10'; // 최신 데이터를 가져올 오염물질 코드 (예: PM10)
    let allData = [];

    try {
        const connection = await createConnection();

        // 기존 데이터 삭제
        await connection.execute('DELETE FROM Info');

        // API 요청
        const response = await axios.get(API_URL, {
            params: {
                serviceKey: API_KEY,
                returnType: 'json', // JSON 형식으로 받기
                numOfRows: MAX_ROWS,
                pageNo: 1,
                searchDate, // 오늘 날짜로 설정
                InformCode: informCode // 오염물질 코드
            }
        });

        const data = response.data.response.body.items;
        if (!data) return; // 데이터가 없으면 종료
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

        await connection.end(); // DB 연결 종료
        console.log("전국 대기질 데이터가 성공적으로 업데이트되었습니다.");
    } catch (error) {
        console.error("전국 데이터 저장 중 오류 발생:", error.message);
    }
}

// 초기 데이터 로드 및 30분마다 반복
fetchAndStoreAirQualityData(); // 서버 시작 시 한 번 실행
setInterval(fetchAndStoreAirQualityData, 30 * 60 * 1000); // 30분마다 데이터 업데이트

module.exports = router;
