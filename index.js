const TelegramApi = require("node-telegram-bot-api");
const TelegramBotPolling = require("node-telegram-bot-api/lib/telegramPolling");
const sqlite3 = require("sqlite3").verbose();
const { Client } = require("pg");
const pgConfig = {};

//const databaseUrl = process.env.DATABASE_URL;
let databaseUrl =
  "postgres://dzvophdaewxhaf:d004c7cc6d69a97527a598e3983002000bf8fe5bb6d85e13e901553b8fb608e8@ec2-63-32-248-14.eu-west-1.compute.amazonaws.com:5432/db82904k63493m";

databaseUrl = databaseUrl.replace("postgres://", "");
let indexChar = databaseUrl.indexOf(":");
pgConfig.user = databaseUrl.slice(0, indexChar);
databaseUrl = databaseUrl.replace(pgConfig.user + ":", "");

indexChar = databaseUrl.indexOf("@");
pgConfig.password = databaseUrl.slice(0, indexChar);
databaseUrl = databaseUrl.replace(pgConfig.password + "@", "");

indexChar = databaseUrl.indexOf(":");
pgConfig.host = databaseUrl.slice(0, indexChar);
databaseUrl = databaseUrl.replace(pgConfig.host + ":", "");

indexChar = databaseUrl.indexOf("/");
pgConfig.port = databaseUrl.slice(0, indexChar);
databaseUrl = databaseUrl.replace(pgConfig.port + "/", "");

pgConfig.database = databaseUrl;
console.log(pgConfig);

const db = new sqlite3.Database("./mock.db", sqlite3.OPEN_READWRITE, (err) => {
  if (err) return console.log(err.message);
  console.log("Connection successful!");
});

const client = new Client({
  host: pgConfig.host,
  user: pgConfig.user,
  port: pgConfig.port,
  password: pgConfig.password,
  database: pgConfig.database,
  ssl: true,
});

client.connect();

// try {
// db.run(
//   "CREATE TABLE compliments (id INTEGER PRIMARY KEY AUTOINCREMENT, compliment TEXT)"
// );
// db.run("CREATE TABLE chats (id INTEGER, username TEXT)");
// db.run("CREATE TABLE complimentsreceived (id INTEGER, chatId INTEGER)");
// } catch {}

const express = require("express");
const app = express();
app.use(express.static("public"));
app.get("/", (request, response) => {
  response.sendFile(`${__dirname}/index.html`);
});

// слушаем поступающие сообщения
var listener = app.listen(process.env.PORT, () => {
  console.log(`Your app is listening on port ${listener.address().port}`);
});

const token = "5155499994:AAGrikr7vtLum_naBEP-3i3uVxq-BnFnlU4";
const bot = new TelegramApi(token, { polling: true });

const uploadCompliment = {};
const deleteCompliment = {};

bot.setMyCommands([
  { command: "/start", description: "Начальное приветствие" },
  { command: "/info", description: "Информация о боте" },
  { command: "/getcompliment", description: "Получить комплимент" },
]);

bot.on("message", async (msg) => {
  const text = msg.text;
  const chatId = msg.chat.id;
  const username = msg.from.username;

  if (text === "/start") {
    // db.all("SELECT * from chats WHERE id = ?", [chatId], (err, rows) => {
    //   if (err) console.log(err.message);
    //   else if (rows.length === 0) {
    //     db.run(`INSERT INTO chats (id, username) VALUES (?, ?)`, [
    //       chatId,
    //       username,
    //     ]);
    //   }
    // });
    console.log(client);
    client.query("SELECT * FROM chats WHERE id = $1", [chatId], (err, res) => {
      if (err) console.log(err.message);
      else if (res.rows.length === 0) {
        client.query(
          "INSERT INTO chats (id, username) VALUES ($1, $2)",
          [chatId, username],
          (err, res) => {}
        );
      }
    });

    return bot.sendMessage(
      chatId,
      "Добро пожаловать, Мария)\nЯ создал этого бота для автоматической отправки комплиментов, но можно получить комплимент и сейчас, используй команду /getcompliment"
    );
  }

  if (text === "/stop") {
    // db.run(`DELETE FROM chats WHERE id = ?`, [chatId]);
    // db.run(`DELETE FROM complimentsreceived WHERE chatId = ?`, [chatId]);
    client.query("DELETE FROM chats WHERE id = $1", [chatId]);
    client.query("DELETE FROM complimentsreceived WHERE chatId = $1", [chatId]);
    return;
  }

  if (text === "/info") {
    return bot.sendMessage(
      chatId,
      "Этот бот создан для регулярных отправок комплиментов замечательной девушке Марии ;)"
    );
  }

  if (text === "/uploadcompliment") {
    uploadCompliment[chatId] = 1;
    return bot.sendMessage(
      chatId,
      "Напиши комплимент, который хочешь добавить!"
    );
  }

  if (text === "/deletecompliment") {
    deleteCompliment[chatId] = 1;
    return bot.sendMessage(
      chatId,
      "Напиши ID комплимента, который хочешь удалить!"
    );
  }

  if (text === "/listofcompliments") {
    // db.each("SELECT * from compliments", [], (err, row) => {
    //   if (err) console.log(err.message);
    //   bot.sendMessage(chatId, `ID: ${row.id} ${row.compliment}`);
    // });
    client.query("SELECT * from compliments", [], (err, res) => {
      if (err) console.log(err.message);
      for (let row of res.rows) {
        bot.sendMessage(chatId, `ID: ${row.id} ${row.compliment}`);
      }
    });
  }

  if (text === "/listofchats") {
    // db.each("SELECT * from chats", [], (err, row) => {
    //   if (err) console.log(err.message);
    //   console.log(row);
    //   bot.sendMessage(chatId, `ID: ${row.id} ${row.username}`);
    // });
    client.query("SELECT * from chats", [], (err, res) => {
      if (err) console.log(err.message);
      for (let row of res.rows) {
        bot.sendMessage(chatId, `ID: ${row.id} ${row.compliment}`);
      }
    });
  }

  if (text === "/getcompliment") {
    // db.all(
    //   "SELECT compliments.id, compliments.compliment from compliments LEFT JOIN complimentsreceived ON compliments.id = complimentsreceived.id AND complimentsreceived.chatId = ?  WHERE complimentsreceived.id IS NULL LIMIT 1",
    //   [chatId],
    //   (err, rows) => {
    //     if (err) console.log(err);
    //     else {
    //       if (rows[0]) {
    //         db.run(
    //           `INSERT INTO complimentsreceived (id, chatId) VALUES (?,?)`,
    //           [rows[0].id, chatId]
    //         );
    //         return bot.sendMessage(chatId, rows[0].compliment);
    //       } else {
    //         return bot.sendMessage(
    //           chatId,
    //           "В боте закончились комплименты(\nСообщи Андрею, он напишет тебе еще)"
    //         );
    //       }
    //     }
    //   }
    // );
    client.query(
      "SELECT compliments.id, compliments.compliment from compliments LEFT JOIN complimentsreceived ON compliments.id = complimentsreceived.id AND complimentsreceived.chatId = $1 WHERE complimentsreceived.id IS NULL LIMIT 1",
      [chatId],
      (err, res) => {
        if (err) console.log(err.message);
        else {
          if (res.rows.length) {
            client.query(
              `INSERT INTO complimentsreceived (id, chatId) VALUES ($1,$2)`,
              [rows[0].id, chatId]
            );
            return bot.sendMessage(chatId, rows[0].compliment);
          } else {
            return bot.sendMessage(
              chatId,
              "В боте закончились комплименты(\nСообщи Андрею, он напишет тебе еще)"
            );
          }
        }
      }
    );
  }

  if (uploadCompliment[chatId] === 1) {
    //db.run(`INSERT INTO compliments (compliment) VALUES (?)`, [text]);
    client.query("INSERT INTO compliments (compliment) VALUES ($1)", [text]);
    delete uploadCompliment[chatId];
    return bot.sendMessage(chatId, text);
  }

  if (deleteCompliment[chatId] === 1) {
    //db.run(`DELETE FROM compliments WHERE id = ?`, [text]);
    client.query("DELETE FROM compliments WHERE id = ?", [text]);
    delete deleteCompliment[chatId];
    return bot.sendMessage(chatId, "Комплимент удален");
  }
});

let timesSendCompliment = 0;

function sendCompliment() {
  timesSendCompliment++;
  console.log(new Date(), timesSendCompliment);

  const date = new Date();

  if (
    timesSendCompliment < 18 &&
    date.getUTCHours() + 2 < 9 &&
    date.getUTCHours() + 2 > 23
  ) {
    // timesSendCompliment = 0;
    // db.each("SELECT * from chats", [], (err, row) => {
    //   db.all(
    //     "SELECT compliments.id, compliments.compliment from compliments LEFT JOIN complimentsreceived ON compliments.id = complimentsreceived.id AND complimentsreceived.chatId = ?  WHERE complimentsreceived.id IS NULL LIMIT 1",
    //     [row.id],
    //     (err, rows) => {
    //       if (err) console.log(err);
    //       else {
    //         if (rows[0]) {
    //           db.run(
    //             `INSERT INTO complimentsreceived (id, chatId) VALUES (?,?)`,
    //             [rows[0].id, row.id]
    //           );
    //           return bot.sendMessage(row.id, rows[0].compliment);
    //         } else {
    //           return;
    //         }
    //       }
    //     }
    //   );
    // });
    timesSendCompliment = 0;
    client.query("SELECT * from chats", [], (err, res) => {
      for (let row of res.rows) {
        client.query(
          "SELECT compliments.id, compliments.compliment from compliments LEFT JOIN complimentsreceived ON compliments.id = complimentsreceived.id AND complimentsreceived.chatId = $1  WHERE complimentsreceived.id IS NULL LIMIT 1",
          [row.id],
          (err, res) => {
            if (err) console.log(err);
            else {
              if (res.rows.length) {
                db.run(
                  `INSERT INTO complimentsreceived (id, chatId) VALUES (?,?)`,
                  [res.rows[0].id, row.id]
                );
                return bot.sendMessage(row.id, res.rows[0].compliment);
              } else {
                return;
              }
            }
          }
        );
      }
    });
  } else return;
}

let timerId = setInterval(sendCompliment, 10 * 60 * 1000);
