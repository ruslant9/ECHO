// frontend/download-emojis.js
const fs = require('fs');
const https = require('https');
const path = require('path');

const OUTPUT_DIR = path.join(__dirname, 'public', 'emojis');
const BASE_URL = 'https://raw.githubusercontent.com/iamcal/emoji-data/master/img-apple-64/';

// 1. Читаем список прямо из файла emoji-data.ts (парсим вручную, чтобы не подключать typescript компилятор)
const dataFile = fs.readFileSync(path.join(__dirname, 'lib', 'emoji-data.ts'), 'utf8');

// Извлекаем всё, что находится внутри кавычек в массивах emojis: ['...', '...']
const regex = /'([^']+)'/g; 
let match;
const emojisToDownload = new Set();

// Исключаем названия категорий и id, оставляем только юникод символы
const reservedWords = ['smileys', 'Смайлики', 'people', 'Жесты и Люди', 'heart', 'Символы', 'nature', 'Природа', 'food', 'Еда', 'emojis', 'id', 'name'];

while ((match = regex.exec(dataFile)) !== null) {
    const val = match[1];
    if (!reservedWords.includes(val) && val.length < 20) { // Фильтр от длинных слов
        emojisToDownload.add(val);
    }
}

// Конвертер в hex для iamcal
const toHex = (str) => {
    return Array.from(str)
        .map(c => c.codePointAt(0).toString(16))
        .join('-')
        .toLowerCase();
};

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

console.log(`Найдено уникальных эмодзи: ${emojisToDownload.size}`);

const list = Array.from(emojisToDownload);
let index = 0;
let success = 0;
let errors = 0;

const downloadNext = () => {
    if (index >= list.length) {
        console.log(`\nГотово! Успешно: ${success}, Ошибок: ${errors}`);
        return;
    }

    const emoji = list[index];
    // Пропускаем, если это явно текст (на всякий случай)
    if (emoji.match(/^[a-z_]+$/)) {
        // console.log(`Skipping text: ${emoji}`);
        index++;
        downloadNext();
        return;
    }

    const hex = toHex(emoji);
    const fileName = `${hex}.png`;
    const filePath = path.join(OUTPUT_DIR, fileName);
    const url = `${BASE_URL}${fileName}`;

    if (fs.existsSync(filePath)) {
        // process.stdout.write('.');
        success++;
        index++;
        setImmediate(downloadNext);
        return;
    }

    https.get(url, (res) => {
        if (res.statusCode === 200) {
            const file = fs.createWriteStream(filePath);
            res.pipe(file);
            file.on('finish', () => {
                file.close();
                success++;
                process.stdout.write(`\r[${Math.round((index / list.length) * 100)}%] Скачан: ${emoji}`);
                index++;
                downloadNext();
            });
        } else {
            // Пробуем альтернативный вариант (иногда нужен fe0f для вариаций)
            const altHex = hex.includes('-fe0f') ? hex.replace('-fe0f', '') : hex + '-fe0f';
            const altUrl = `${BASE_URL}${altHex}.png`;
            
            https.get(altUrl, (res2) => {
                if (res2.statusCode === 200) {
                    const file = fs.createWriteStream(filePath); // Сохраняем под исходным именем, чтобы фронт нашел
                    res2.pipe(file);
                    file.on('finish', () => {
                        file.close();
                        success++;
                        index++;
                        downloadNext();
                    });
                } else {
                    errors++;
                    // console.log(`\nНе найден: ${emoji} (${url})`);
                    index++;
                    downloadNext();
                }
            }).on('error', () => {
                index++;
                downloadNext();
            });
        }
    }).on('error', (err) => {
        console.error(`Ошибка сети: ${err.message}`);
        index++;
        downloadNext();
    });
};

// Запускаем в 5 потоков для скорости
for(let i=0; i<5; i++) downloadNext();