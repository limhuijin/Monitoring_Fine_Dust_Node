var express = require('express');
var router = express.Router();
const { XMLHttpRequest } = require('xmlhttprequest');
const mysql = require('mysql2/promise');
const config = require('../conf/config');
const xml2js = require('xml2js');

//데이터베이스 연결 생성
async function createConnection() {
    try {
        const connection = await mysql.createConnection({
            host: config.DB_HOST,
            user: config.DB_USER,
            password: config.DB_PASSWORD,
            database: config.DB_DATABASE,
            port: config.DB_PORT
        });
        console.log("데이터베이스에 성공적으로 연결되었습니다.");
        return connection;
    } catch (error) {
        console.error("데이터베이스 연결 중 오류 발생:", error.message);
        throw error;
    }
}

// 전국 데이터 불러와 DB에 저장하고 JSON 파일로 저장하는 함수
async function fetchAndStoreAirQualityData() {
    let connection; // 함수 시작 부분에서 connection 변수를 선언
    try {
        const connection = await createConnection();

        await connection.execute("DELETE FROM Info");
        console.log("기존 데이터가 성공적으로 삭제되었습니다.");

        const xhr = new XMLHttpRequest();
        const url = 'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty';
        let queryParams = '?' + encodeURIComponent('serviceKey') + '=' + '';
        queryParams += '&' + encodeURIComponent('returnType') + '=' + encodeURIComponent('xml');
        queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('2500');
        queryParams += '&' + encodeURIComponent('pageNo') + '=' + encodeURIComponent('1');
        queryParams += '&' + encodeURIComponent('sidoName') + '=' + encodeURIComponent('전국');
        queryParams += '&' + encodeURIComponent('ver') + '=' + encodeURIComponent('1.0');

        xhr.open('GET', url + queryParams, true);

        xhr.onreadystatechange = async function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // XML 데이터를 JSON으로 변환
                    xml2js.parseString(xhr.responseText, { explicitArray: false }, async (err, result) => {
                        if (err) {
                            console.error("XML 파싱 오류:", err.message);
                            return;
                        }

                        // JSON 데이터로 변환된 응답에서 필요한 정보 추출
                        const airQualityData = result.response.body.items.item;

                        for (const item of airQualityData) {
                            // 필요한 데이터 추출 및 DB 삽입 예시
                            const {
                                sidoName = null,
                                stationName = null,
                                dateTime = null,
                                pm10Value = null,
                                pm25Value = null,
                                khaiValue = null,
                            } = item;
                            await connection.execute(
                                "INSERT INTO Info (sidoName, stationName, dateTime, pm10Value, pm25Value, khaiValue) VALUES (?, ?, ?, ?, ?, ?)",
                                [sidoName, stationName, dateTime, pm10Value, pm25Value, khaiValue]
                            );
                        }

                        console.log("데이터가 성공적으로 저장되었습니다.");
                    });
                } else {
                    console.error('요청 실패:', xhr.status, xhr.statusText);
                }
            }
        };

        xhr.send();
 
    } catch (error) {
        console.error("전국 대기질 데이터 저장 중 오류 발생:", error.message);
    } finally {
        if (connection) {
            connection.end();  // 데이터베이스 연결 종료
        }
    }
}


// 초기 데이터 로드 및 30분마다 반복
fetchAndStoreAirQualityData(); // 서버 시작 시 한 번 실행
setInterval(fetchAndStoreAirQualityData, 30 * 60 * 1000); // 30분마다 데이터 업데이트

module.exports = router;
