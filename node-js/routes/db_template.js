var express = require('express');
var router = express.Router();

const mysql = require('mysql2/promise');
const config = require('../conf/config');


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