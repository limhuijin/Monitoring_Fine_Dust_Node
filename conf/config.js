const fs = require('fs');
const path = require('path');

// application.properties 파일 읽기
const configPath = path.join(__dirname, '../application.properties');
const properties = fs.readFileSync(configPath, 'utf-8');

// 속성 값을 객체로 변환
const config = {};
properties.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        config[key.trim()] = value.trim();
    }
});

module.exports = config;
