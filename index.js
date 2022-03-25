const TelegramApi = require("node-telegram-bot-api");
const TelegramBotPolling = require("node-telegram-bot-api/lib/telegramPolling");
const sqlite3 = require("sqlite3").verbose();

const db = new sqlite3.Database("./mock.db", sqlite3.OPEN_READWRITE, (err) => {
  if (err) return console.log(err.message);
  console.log("Connection successful!");
});

// try {
// db.run(
//   "CREATE TABLE compliments (id INTEGER PRIMARY KEY AUTOINCREMENT, compliment TEXT)"
// );
// db.run("CREATE TABLE chats (id INTEGER, username TEXT)");
// db.run("CREATE TABLE complimentsreceived (id INTEGER, chatId INTEGER)");
// } catch {}

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
    db.all("SELECT * from chats WHERE id = ?", [chatId], (err, rows) => {
      if (err) console.log(err.message);
      else if (rows.length === 0) {
        db.run(`INSERT INTO chats (id, username) VALUES (?, ?)`, [
          chatId,
          username,
        ]);
      }
    });
    return bot.sendMessage(
      chatId,
      "Добро пожаловать, Мария)\nЯ создал этого бота для автоматической отправки комплиментов, но можно получить комплимент и сейчас, используй команду /getcompliment"
    );
  }

  if (text === "/stop") {
    db.run(`DELETE FROM chats WHERE id = ?`, [chatId]);
    db.run(`DELETE FROM complimentsreceived WHERE chatId = ?`, [chatId]);
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
    db.each("SELECT * from compliments", [], (err, row) => {
      if (err) console.log(err.message);
      bot.sendMessage(chatId, `ID: ${row.id} ${row.compliment}`);
    });
  }

  if (text === "/listofchats") {
    db.each("SELECT * from chats", [], (err, row) => {
      if (err) console.log(err.message);
      console.log(row);
      bot.sendMessage(chatId, `ID: ${row.id} ${row.username}`);
    });
  }

  if (text === "/getcompliment") {
    db.all(
      "SELECT compliments.id, compliments.compliment from compliments LEFT JOIN complimentsreceived ON compliments.id = complimentsreceived.id AND complimentsreceived.chatId = ?  WHERE complimentsreceived.id IS NULL LIMIT 1",
      [chatId],
      (err, rows) => {
        if (err) console.log(err);
        else {
          if (rows[0]) {
            db.run(
              `INSERT INTO complimentsreceived (id, chatId) VALUES (?,?)`,
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
    db.run(`INSERT INTO compliments (compliment) VALUES (?)`, [text]);
    delete uploadCompliment[chatId];
    return bot.sendMessage(chatId, text);
  }

  if (deleteCompliment[chatId] === 1) {
    db.run(`DELETE FROM compliments WHERE id = ?`, [text]);
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
    timesSendCompliment >= 2 //&&
    //date.getUTCHours() + 2 < 9 &&
    //date.getUTCHours() + 2 > 23
  ) {
    timesSendCompliment = 0;
    db.each("SELECT * from chats", [], (err, row) => {
      db.all(
        "SELECT compliments.id, compliments.compliment from compliments LEFT JOIN complimentsreceived ON compliments.id = complimentsreceived.id AND complimentsreceived.chatId = ?  WHERE complimentsreceived.id IS NULL LIMIT 1",
        [row.id],
        (err, rows) => {
          if (err) console.log(err);
          else {
            if (rows[0]) {
              db.run(
                `INSERT INTO complimentsreceived (id, chatId) VALUES (?,?)`,
                [rows[0].id, row.id]
              );
              return bot.sendMessage(row.id, rows[0].compliment);
            } else {
              return;
            }
          }
        }
      );
    });
  } else return;
}

let timerId = setInterval(sendCompliment, 10 * 60 * 1000);
