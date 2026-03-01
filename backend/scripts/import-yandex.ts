import { YandexMusicClient } from 'yandex-music-client';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import inquirer from 'inquirer';
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// ================= НАСТРОЙКИ =================

const YANDEX_TOKEN = process.env.YANDEX_TOKEN!;
const TEMP_DIR = path.join(process.cwd(), 'uploads', 'temp');

if (!YANDEX_TOKEN) {
    throw new Error("Переменная YANDEX_TOKEN не найдена в .env");
}

const cloudinaryAccounts = JSON.parse(process.env.CLOUDINARY_ACCOUNTS || '[]');
let currentCloudIndex = Math.floor(Math.random() * cloudinaryAccounts.length);

if (cloudinaryAccounts.length === 0) {
    throw new Error("Не найдены аккаунты Cloudinary в .env");
}

// ================= PRISMA =================

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ================= YANDEX CLIENT =================

const client = new YandexMusicClient({
    BASE: 'https://api.music.yandex.net',
    HEADERS: {
        Authorization: `OAuth ${YANDEX_TOKEN}`,
        'Accept-Language': 'ru',
    },
});

// ================= ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =================

function getNextCloudinaryAccount() {
    const account = cloudinaryAccounts[currentCloudIndex];
    currentCloudIndex = (currentCloudIndex + 1) % cloudinaryAccounts.length;
    return account;
}

// Скачивание во временную папку и загрузка в Cloudinary с механизмом повторных попыток
async function downloadAndUploadToCloudinary(url: string | undefined, type: 'avatars' | 'audio'): Promise<string | null> {
    if (!url) return null;

    const MAX_FILE_SIZE = 30 * 1024 * 1024; // 30 МБ
    const MAX_RETRIES = 3; // Количество попыток скачать файл

    let cleanUrl = url.replace('%%', type === 'audio' ? '' : '1000x1000');
    if (!cleanUrl.startsWith('http')) cleanUrl = `https://${cleanUrl}`;

    if (!fs.existsSync(TEMP_DIR)) {
        fs.mkdirSync(TEMP_DIR, { recursive: true });
    }

    const ext = type === 'audio' ? '.mp3' : '.jpg';
    const tempFilePath = path.join(TEMP_DIR, `${crypto.randomUUID()}${ext}`);

    // Цикл повторных попыток
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // 1. Скачиваем файл
            const response = await axios({ 
                url: cleanUrl, 
                method: 'GET', 
                responseType: 'stream',
                timeout: 60000, // 60 секунд на соединение
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': '*/*',
                }
            });

            const contentLength = response.headers['content-length'];
            if (contentLength) {
                const sizeInBytes = parseInt(contentLength, 10);
                if (sizeInBytes > MAX_FILE_SIZE) {
                    const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2);
                    console.warn(`   ⚠️ Файл слишком большой (${sizeInMB} МБ). Лимит 30 МБ. Пропуск.`);
                    response.data.destroy(); 
                    return null;
                }
            }
            
            const writer = fs.createWriteStream(tempFilePath);
            response.data.pipe(writer);

            await new Promise<void>((resolve, reject) => {
                writer.on('finish', () => resolve());
                writer.on('error', reject);
            });

            // 2. Выбираем аккаунт Cloudinary
            const account = getNextCloudinaryAccount();

            cloudinary.config({
                cloud_name: account.cloud_name,
                api_key: account.api_key,
                api_secret: account.api_secret,
                secure: true
            });

            // 3. Загружаем в Cloudinary
            const result = await cloudinary.uploader.upload(tempFilePath, {
                folder: type, 
                resource_type: type === 'audio' ? 'video' : 'image',
                timeout: 180000 
            });

            return result.secure_url; // Если дошли сюда — всё успешно

        } catch (e: any) {
            const isNetworkError = e.code === 'ETIMEDOUT' || e.code === 'ECONNRESET' || e.message.includes('timeout');
            
            if (isNetworkError && attempt < MAX_RETRIES) {
                console.warn(`   ⏳ Ошибка сети (Попытка ${attempt}/${MAX_RETRIES}). Повтор через 3 секунды...`);
                // Удаляем битый временный файл если он создался
                if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
                // Ждем 3 сек перед следующей попыткой
                await new Promise(r => setTimeout(r, 3000));
                continue; 
            }

            // Если это не ошибка сети или попытки кончились
            console.warn(`\n   ⚠️ Ошибка обработки файла (${type}):`);
            if (e.response) {
                console.warn(`   Status: ${e.response.status}`);
            } else {
                console.warn(`   Message: ${e.message}`);
            }
            return null;
        } finally {
            // Очистка временного файла
            if (fs.existsSync(tempFilePath)) {
                try { fs.unlinkSync(tempFilePath); } catch (err) {}
            }
        }
    }
    return null;
}

async function getDirectTrackUrl(trackId: number | string): Promise<string | null> {
    try {
        const downloadResp = await client.tracks.getDownloadInfo(String(trackId));
        const list = downloadResp.result;
        if (!list || list.length === 0) return null;

        const best = list.reduce((prev: any, current: any) =>
            (current.bitrateInKbps ?? 0) > (prev.bitrateInKbps ?? 0) ? current : prev
        );

        const xmlResp = await axios.get(best.downloadInfoUrl);
        const xml: string = xmlResp.data;
        const host = xml.match(/<host>(.*?)<\/host>/)?.[1];
        const pathVal = xml.match(/<path>(.*?)<\/path>/)?.[1];
        const ts = xml.match(/<ts>(.*?)<\/ts>/)?.[1];
        const s = xml.match(/<s>(.*?)<\/s>/)?.[1];

        if (!host || !pathVal || !ts || !s) return null;
        const sign = crypto.createHash('md5').update('XGRlBW9FXlekgbPrRHuSiA' + pathVal.substring(1) + s).digest('hex');
        return `https://${host}/get-mp3/${sign}/${ts}${pathVal}`;
    } catch { return null; }
}

// --- ОБНОВЛЕННАЯ ФУНКЦИЯ ПОИСКА АРТИСТА С ПРОВЕРКОЙ АВАТАРА ---
async function getOrCreateArtist(yArtist: any) {
    let dbArtist = await prisma.artist.findFirst({
        where: { name: { equals: yArtist.name, mode: 'insensitive' } }
    });

    if (!dbArtist) {
        console.log(`👤 Создание артиста: ${yArtist.name}`);
        const avatar = await downloadAndUploadToCloudinary(yArtist.cover?.uri, 'avatars');
        dbArtist = await prisma.artist.create({
            data: {
                name: yArtist.name,
                avatar,
                bio: "Импортированный артист"
            }
        });
    } else if (!dbArtist.avatar && yArtist.cover?.uri) {
        // Если артист есть, но нет аватарки — пробуем догрузить
        console.log(`👤 У артиста ${dbArtist.name} нет аватарки. Загружаем...`);
        const avatar = await downloadAndUploadToCloudinary(yArtist.cover?.uri, 'avatars');
        if (avatar) {
            dbArtist = await prisma.artist.update({
                where: { id: dbArtist.id },
                data: { avatar }
            });
            console.log(`   ✅ Аватарка обновлена`);
        }
    }
    return dbArtist;
}

// ================= ОСНОВНАЯ ЛОГИКА =================

async function processArtist(query: string) {
    console.log(`🔍 Поиск артиста: "${query}"`);
    const searchResp = await client.search.search(query, 0, 'artist');
    const yandexArtist = searchResp.result?.artists?.results?.[0];

    if (!yandexArtist) {
        console.log('❌ Артист не найден');
        return;
    }

    const mainDbArtist = await getOrCreateArtist(yandexArtist);

    const albumsResp = await client.artists.getArtistsDirectAlbums(String(yandexArtist.id));
    const yandexAlbums = albumsResp.result?.albums ?? [];

    for (const yAlbum of yandexAlbums) {
        const fullAlbumResp = await client.albums.getAlbumsWithTracks(Number(yAlbum.id));
        let fullAlbum = Array.isArray(fullAlbumResp.result) ? fullAlbumResp.result[0] : fullAlbumResp.result;
        
        if (!fullAlbum?.volumes) continue;
        const yandexTracks = fullAlbum.volumes.flat(); 

        let dbAlbum = await prisma.album.findFirst({
            where: { title: yAlbum.title, artistId: mainDbArtist.id },
            include: { _count: { select: { tracks: true } } }
        });

        // ЛОГИКА АЛЬБОМА (С ПРОВЕРКОЙ ОБЛОЖКИ)
        if (dbAlbum) {
            // 1. Проверяем обложку
            if (!dbAlbum.coverUrl && yAlbum.coverUri) {
                console.log(`📀 У альбома "${yAlbum.title}" нет обложки. Загружаем...`);
                const cover = await downloadAndUploadToCloudinary(yAlbum.coverUri, 'avatars');
                if (cover) {
                    dbAlbum = await prisma.album.update({
                        where: { id: dbAlbum.id },
                        data: { coverUrl: cover },
                        include: { _count: { select: { tracks: true } } }
                    });
                    console.log(`   ✅ Обложка альбома обновлена`);
                }
            }

            // 2. Проверяем треки
            if (dbAlbum._count.tracks >= yandexTracks.length) {
                console.log(`⏩ Пропуск альбома (полный и с обложкой): ${yAlbum.title}`);
                continue;
            } else {
                console.log(`🔄 Альбом существует, но не полный. Докачиваем треки: ${yAlbum.title}`);
            }
        } else {
            console.log(`\n💿 Создание альбома: ${yAlbum.title}`);
            const cover = await downloadAndUploadToCloudinary(yAlbum.coverUri, 'avatars');

            dbAlbum = await prisma.album.create({
                data: {
                    title: yAlbum.title,
                    artistId: mainDbArtist.id,
                    year: yAlbum.year ?? null,
                    genre: yAlbum.genre ?? (yAlbum.genres?.[0] || null),
                    coverUrl: cover,
                    releaseDate: yAlbum.releaseDate ? new Date(yAlbum.releaseDate) : null,
                },
                include: { _count: { select: { tracks: true } } }
            });
        }

        let trackCounter = 1;
        
        for (const track of yandexTracks) {
            const existingTrack = await prisma.track.findFirst({
                where: { title: track.title, albumId: dbAlbum.id }
            });

            // ЛОГИКА ТРЕКА (С ПРОВЕРКОЙ ОБЛОЖКИ)
            if (existingTrack) {
                // Если у трека нет обложки, но она есть у альбома — обновляем
                if (!existingTrack.coverUrl && dbAlbum.coverUrl) {
                     await prisma.track.update({
                        where: { id: existingTrack.id },
                        data: { coverUrl: dbAlbum.coverUrl }
                     });
                     // Не пишем в консоль, чтобы не спамить, это техническая правка
                }
                
                console.log(`   ⏩ Пропуск трека (уже есть): [${trackCounter}] ${track.title}`);
                trackCounter++;
                continue; 
            }

            console.log(`   🎵 Скачивание трека [${trackCounter}]: ${track.title}`);

            const trackArtists = track.artists || [];
            const artistInstances = [];

            for (const [idx, yArt] of trackArtists.entries()) {
                const dbArt = await getOrCreateArtist(yArt);
                artistInstances.push(dbArt);

                if (idx > 0) {
                    await prisma.album.update({
                        where: { id: dbAlbum.id },
                        data: { featuredArtists: { connect: { id: dbArt.id } } }
                    });
                }
            }

            const mainArtist = artistInstances[0];
            const guestArtists = artistInstances.slice(1);

            const directUrl = await getDirectTrackUrl(track.id);
            if (!directUrl) {
                console.warn(`   ⚠️ Не удалось получить ссылку для: ${track.title}`);
                trackCounter++;
                continue;
            }

            const audioUrl = await downloadAndUploadToCloudinary(directUrl, 'audio');
            if (!audioUrl) {
                trackCounter++;
                continue;
            }

            await prisma.track.create({
                data: {
                    title: track.title,
                    artistId: mainArtist.id,
                    albumId: dbAlbum.id,
                    duration: Math.floor((track.durationMs ?? 0) / 1000),
                    url: audioUrl,
                    coverUrl: dbAlbum.coverUrl, // Берем актуальную обложку альбома
                    genre: dbAlbum.genre,
                    releaseDate: dbAlbum.releaseDate,
                    trackNumber: trackCounter, 
                    featuredArtists: {
                        connect: guestArtists.map(g => ({ id: g.id }))
                    }
                }
            });

            trackCounter++;
            await new Promise<void>(resolve => setTimeout(resolve, 500)); 
        }
    }
    console.log('\n✅ Импорт завершен!');
}

// ================= ЗАПУСК =================

async function main() {
    const { query } = await inquirer.prompt([
        { type: 'input', name: 'query', message: 'Введите имя артиста:' },
    ]);
    await processArtist(query);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());