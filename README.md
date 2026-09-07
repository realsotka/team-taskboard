# Дошка задач — AllAzs · Soda Cleaning · Інше

Приватна командна дошка задач (Trello-подібна) для команди з 6 осіб: Стас, Олег, Рома, Саша, Давід, Вова.

## Можливості

- Три блоки задач: **AllAzs**, **Soda Cleaning**, **Інше**
- Картка задачі: заголовок, відповідальний, дата; при кліку — деталі
- Нотатки прогресу з автором і часом
- Зміна відповідального, позначка «Виконано» / повернення «В роботу»
- Фіксація дати й часу додавання та виконання
- Фільтри: Всі / В роботі / Виконано
- Вхід за іменем + PIN-код команди (PIN перевіряється сервером на кожному запиті до API)

## Стек

- **Фронтенд:** React + Vite + Tailwind CSS + shadcn/ui
- **Бекенд:** Express (Node.js)
- **База даних:** SQLite (better-sqlite3 + Drizzle ORM) — файл `data.db` створюється автоматично

## Запуск локально

```bash
npm install
npm run dev
# відкрити http://localhost:5000
```

## Продакшн

```bash
npm run build
NODE_ENV=production node dist/index.cjs
```

## PIN-код

За замовчуванням PIN — `2026`. Змінити можна через змінну оточення:

```bash
BOARD_PIN=1234 node dist/index.cjs
```

## Хостинг

Застосунок має бекенд і базу даних, тому **GitHub Pages не підходить** (він лише для статичних сайтів). Варіанти безкоштовного/дешевого хостингу Node.js із постійним диском для SQLite:

- [Railway](https://railway.app) — деплой прямо з GitHub-репозиторію
- [Render](https://render.com) — web service + persistent disk для `data.db`
- [Fly.io](https://fly.io) — volume для бази

Команда деплою: build — `npm run build`, start — `NODE_ENV=production node dist/index.cjs`. Порт: 5000 (або задати через `PORT`).
