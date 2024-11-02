var express = require('express');
const axios = require('axios');
var router = express.Router();

const mysql = require('mysql2/promise');
const config = require('../conf/config');

//미세먼지 api
const API_URL = "http://apis.data.go.kr/B552584/ArpltnInforInqireSvc";  
const API_KEY = "NirKOUIgxxTRm0PmhS9WJnW2RBIE2%2BntU%2BWVYVvr79ZpxbIF99YHK%2B9M6oskOYOpIx9z8VHxKPKPEa1iRPxGLw%3D%3D";
const MAX_ROWS = 10000; 


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

//미세먼지 api 가지고 오기
router.get('/air-quality', async (req, res) => {
    const { sidoName } = req.query; // 도시 이름을 쿼리로 받음
    let pageNo = 1;
    let allData = [];

    try {
        const connection = await createConnection();

        // API 데이터를 페이지 단위로 가져와서 DB에 저장
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

        await connection.end(); // DB 연결 종료
        res.json({ result: true, items: allData });
    } catch (error) {
        res.status(500).json({ result: false, message: 'Error fetching and saving air quality data', error: error.message });
    }
});

// 1. GET POST /list - 데이터 조회
router.get('/list', async (req, res) => {
    try {
        const connection = await createConnection();
        const [rows] = await connection.execute('SELECT * FROM test');
        await connection.end();

        res.json({ result: true, list: rows });
    } catch (error) {
        res.status(500).json({ result: false, message: 'Error fetching data', error: error.message });
    }
});

router.post('/list', async (req, res) => {
    try {
        const connection = await createConnection();
        const [rows] = await connection.execute('SELECT * FROM test');
        await connection.end();

        res.json({ result: true, list: rows });
    } catch (error) {
        res.status(500).json({ result: false, message: 'Error fetching data', error: error.message });
    }
});

router.post('/one/:num', async (req, res) => {
    const { num } = req.body; // 파라미터를 JSON Object로 변환

    try {
        const connection = await createConnection();
        const [data] = await connection.execute('SELECT * FROM test WHERE num = ?', [num]);
        await connection.end();

        res.json({ result: true, data: data[0] });
    } catch (error) {
        res.status(500).json({ result: false, message: 'Error fetching data', error: error.message });
    }
});


// 2. POST /create - 데이터 삽입
router.post('/insert', async (req, res) => {
    const { name } = req.body; // 파라미터를 JSON Object로 변환
    
    try {
        const connection = await createConnection();
        const [result] = await connection.execute('INSERT INTO test (name) VALUES (?)', [name]);
        await connection.end();

        res.json({ result: true, message: 'Data inserted', insertId: result.insertId });
    } catch (error) {
        res.status(500).json({ result: false, message: 'Error inserting data', error: error.message });
    }
});


// 3. PUT /update/:id - 데이터 수정
router.put('/update', async (req, res) => {
    const { num, name } = req.body;

    try {
        const connection = await createConnection();
        await connection.execute('UPDATE test SET name = ? WHERE num = ?', [name, num]);
        await connection.end();

        res.json({ result: true, message: 'Data updated' });
    } catch (error) {
        res.status(500).json({ result: false, message: 'Error updating data', error: error.message });
    }
});


// 4. DELETE /delete/:id - 데이터 삭제
router.delete('/delete', async (req, res) => {
    const { num } = req.body;

    try {
        const connection = await createConnection();
        await connection.execute('DELETE FROM test WHERE num = ?', [num]);
        await connection.end();

        res.json({ result: true, message: 'Data deleted' });
    } catch (error) {
        res.status(500).json({ result: false, message: 'Error deleting data', error: error.message });
    }
});

module.exports = router;