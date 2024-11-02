var express = require('express');
var router = express.Router();
const { XMLHttpRequest } = require('xmlhttprequest');
const mysql = require('mysql2/promise');
const config = require('../conf/config');

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
    try {
        const connection = await createConnection();

        const xhr = new XMLHttpRequest();
        const url = 'http://apis.data.go.kr/B552584/ArpltnInforInqireSvc/getCtprvnRltmMesureDnsty';
        let queryParams = '?' + encodeURIComponent('serviceKey') + '=' + 'gDrKnQzj%2BzUrq%2Bp%2BJBn90S5Z391L0R4Vgn0pswNaZtG%2FHao43YNaj%2B71Z0Sg3o3QDBtdL2vD5TYo8puLMFPkfA%3D%3D';
        queryParams += '&' + encodeURIComponent('returnType') + '=' + encodeURIComponent('json');
        queryParams += '&' + encodeURIComponent('numOfRows') + '=' + encodeURIComponent('1000');
        queryParams += '&' + encodeURIComponent('pageNo') + '=' + encodeURIComponent('1');
        queryParams += '&' + encodeURIComponent('sidoName') + '=' + encodeURIComponent('전국');
        queryParams += '&' + encodeURIComponent('ver') + '=' + encodeURIComponent('1.0');

        xhr.open('GET', url + queryParams, true);

        xhr.onreadystatechange = async function () {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    const responseData = JSON.parse(xhr.responseText);
                    
                    // 예시로, data.list에서 필요한 정보를 가져와 데이터베이스에 저장
                    const airQualityData = responseData.response.body.items;
                    
                    for (const item of airQualityData) {
                        // 필요한 데이터 추출 및 DB 삽입 예시
                        const { sidoName, stationName, dateTime, pm10Value, pm25Value, khaiValue } = item;
                        await connection.execute(
                            'INSERT INTO AirQualityData (sidoName, stationName, dateTime, pm10Value, pm25Value, khaiValue) VALUES (?, ?, ?, ?, ?, ?)',
                            [ sidoName, stationName, dateTime, pm10Value, pm25Value, khaiValue ]
                        );
                    }

                    console.log("데이터가 성공적으로 저장되었습니다.");
                } else {
                    console.error('요청 실패:', xhr.status, xhr.statusText);
                }
                connection.end();  // 데이터베이스 연결 종료
            }
        };

        xhr.send();
 
    } catch (error) {
        console.error("전국 대기질 데이터 저장 중 오류 발생:", error.message);
    }
}

// 초기 데이터 로드 및 30분마다 반복
fetchAndStoreAirQualityData(); // 서버 시작 시 한 번 실행
setInterval(fetchAndStoreAirQualityData, 30 * 60 * 1000); // 30분마다 데이터 업데이트

module.exports = router;
