const words = require('./words');
const nickName = require('./nickName');
const teamName = require('./teamName');
const avatar = require('./avatar');


process.env['PROXY_SOCKS5_HOST'] = '';
process.env['PROXY_SOCKS5_PORT'] = '';
process.env['token'] = '';
const TelegramBot = require('node-telegram-bot-api');
var Agent = require('socks5-https-client/lib/Agent');
const bot = new TelegramBot(process.env.token, {
	polling: true,
	request: {
		agentClass: Agent,
		agentOptions: {
			socksHost: process.env.PROXY_SOCKS5_HOST,
			socksPort: parseInt(process.env.PROXY_SOCKS5_PORT),
			// If authorization is needed:
			socksUsername: '',
			socksPassword: ''
		}
	}
});

var main = {};
bot.onText(/\/start/, (msg) => {
  main[msg.chat.id] = {
    state: null,
    crc: false,
    teams: {},
    arr: [],
    game: {},
    variableOfDiff: null,
    tmpLinuxObj: {},
    line: [],
    current: 0,
    setting: {
      roundTime: 60,
      commonWord: true
    }
  };
  mainMenu(msg);
});

bot.onText(/🆕 Новая игра/, (msg) => newGame(msg));

bot.onText(/⚙ Настройки/, (msg) => setting(msg));

bot.onText(/main[msg.chat.id].setting.roundTime/, (msg) => newGame(msg));

bot.on('message', (msg) => {
  if (main[msg.chat.id]) {
    if (msg.text === '🚪 Выйти') {
      mainMenu(msg);
    } else {
      main[msg.chat.id].crc = false;
      if (main[msg.chat.id].state === 'qtyWords' && isNumeric(+msg.text)) difficultF(msg);
      if (main[msg.chat.id].state === 'teams' && isNumeric(+msg.text)) team(msg);
      if (main[msg.chat.id].state === 'nameP' && main[msg.chat.id].game.qtyTeams != main[msg.chat.id].arr.length) hand1(msg);
      if (main[msg.chat.id].state === 'nameP' && main[msg.chat.id].game.qtyTeams == main[msg.chat.id].arr.length) qtyWords(msg);
      if (main[msg.chat.id].state === 'name' && !main[msg.chat.id].crc) hand(msg);
      if (main[msg.chat.id].state === 'qtyPlayers' && isNumeric(+msg.text)) qtyPlayers(msg);
      if (main[msg.chat.id].state === 'selectTeam') selectTeam(msg);
      if (main[msg.chat.id].state === 'setting' && msg.text[0] === '⏳') roundTimeF(msg);
      if (main[msg.chat.id].state === 'roundTime' && isNumeric(+msg.text)) setting(msg);
      if (main[msg.chat.id].state === 'setting' && msg.text[0] === 'О') commonWordF(msg);
    }
  }
});

bot.onText(/✏ Ввести вручную/, (msg) => hand1(msg));

bot.onText(/👥 Случайные имена/, (msg) => randNames(msg));

bot.onText(/😎 Легкий/, (msg) => pickDifficult(msg));
bot.onText(/🧐 Умеренный/, (msg) => pickDifficult(msg));
bot.onText(/🤯 Мозговой штурм/, (msg) => pickDifficult(msg));

bot.onText(/🚀 Начать/, (msg) => {
  roundStart(msg);
});

bot.onText(/✅ Отгадано/, (msg) => {
  if (main[msg.chat.id].state === 'step') understand(msg);
  if (main[msg.chat.id].state === 'endRound') understandEnd(msg);
});

bot.onText(/❌ Пропустить/, (msg) => {
  if (main[msg.chat.id].state === 'step') skip(msg);
  if (main[msg.chat.id].state === 'endRound' && main[msg.chat.id].setting.commonWord) drawPoints(msg);
  if (main[msg.chat.id].state === 'endRound' && !main[msg.chat.id].setting.commonWord) understandEnd(msg);
});

function mainMenu (msg) {
  main[msg.chat.id].state = 'newGame';
  main[msg.chat.id].teams = {};
  main[msg.chat.id].arr = [];
  main[msg.chat.id].game = {};
  main[msg.chat.id].variableOfDiff = null;
  main[msg.chat.id].tmpLinuxObj = {};
  main[msg.chat.id].line = [];
  main[msg.chat.id].current = 0;
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['🆕 Новая игра'],
        ['⚙ Настройки']
      ],
      resize_keyboard: true
    })
  };
  bot.sendMessage(msg.chat.id, '🅰 Alias в Telegram!', opts);
}

function setting (msg) {
  if (main[msg.chat.id].state === 'roundTime') {
    if (+msg.text > 300 || +msg.text < 30) {
      roundTimeF(msg);
      return;
    }
    main[msg.chat.id].setting.roundTime = +msg.text;
  }
  if (main[msg.chat.id].state === 'commonWord') {
    main[msg.chat.id].setting.commonWord = !main[msg.chat.id].setting.commonWord;
  }
  main[msg.chat.id].state = 'setting';
  const roundTime = '⏳ Время раунда: ' + main[msg.chat.id].setting.roundTime;
  const commonWord = main[msg.chat.id].setting.commonWord ? 'Общее последнее слово: ✔ Вкл' : 'Общее последнее слово: ✖ Выкл';
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        [roundTime],
        [commonWord],
        ['🚪 Выйти']
      ],
      resize_keyboard: true
    })
  };
  bot.sendMessage(msg.chat.id, 'Воспользуйтесь меню 👇', opts);
}

function roundTimeF (msg) {
  main[msg.chat.id].state = 'roundTime';
  bot.sendMessage(msg.chat.id, 'Введите время раунда в секундах\n(От 30 до 300)');
}

function commonWordF (msg) {
  main[msg.chat.id].state = 'commonWord';
  setting(msg);
}

function newGame (msg) {
  main[msg.chat.id].state = 'teams';
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['🚪 Выйти'],
      ],
      resize_keyboard: true
    })
  };
  bot.sendMessage(msg.chat.id, 'Введите количество команд', opts);
}

function team (msg) {
  if (+msg.text > 20) {
    bot.sendMessage(msg.chat.id, 'Максимальное количество команд − 20\nНеужели вам нужно больше?? 🤦‍♂️');
    return;
  }
  main[msg.chat.id].game.qtyTeams = +msg.text;
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['✏ Ввести вручную'],
        ['👥 Случайные имена'],
        ['🚪 Выйти']
      ],
      resize_keyboard: true
    })
  }
  bot.sendMessage(msg.chat.id, 'Количество команд: ' + msg.text + '\nВыбрать случайные имена игроков?', opts);
}

function hand1 (msg) {
  if (msg.text.length > 300 || msg.text.split('\n').length > 20) {
    bot.sendMessage(msg.chat.id, 'Максимальная количество символов суммарно - 300\nМаксимальное количество символов для одного имени - 25\nМаксимальное количество игроков в одной команде - 20');
    return;
  }
  let check = false;
  msg.text.split('\n').map( (value) => {
    if (value.length > 25) {
      bot.sendMessage(msg.chat.id, 'Максимальная количество символов суммарно - 300\nМаксимальное количество символов для одного имени - 25\nМаксимальное количество игроков в одной команде - 20');
      check = true;
      return;
    }
  });
  if (check) return;
  main[msg.chat.id].state = 'name';
  main[msg.chat.id].crc = true;
  if (main[msg.chat.id].arr.length) main[msg.chat.id].teams[main[msg.chat.id].arr[main[msg.chat.id].arr.length-1]] = msg.text.split('\n');
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['🚪 Выйти']
      ],
      resize_keyboard: true
    })
  }
  bot.sendMessage(msg.chat.id, outputName(msg) + 'Введите название команды ' + (Object.keys(main[msg.chat.id].teams).length + 1), opts);
}

function hand (msg) {
  if (msg.text.length > 25 || msg.text.indexOf('\n') != -1) {
    bot.sendMessage(msg.chat.id, 'Максимальное количество символов - 25\nНельзя использовать знак "новой строки"');
    return;
  }
  main[msg.chat.id].state = 'nameP';
  main[msg.chat.id].teams[avatarF() + ' ' + msg.text] = null;
  main[msg.chat.id].arr.push(Object.keys(main[msg.chat.id].teams)[Object.keys(main[msg.chat.id].teams).length - 1]);
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['🚪 Выйти']
      ],
      resize_keyboard: true
    })
  }
  bot.sendMessage(msg.chat.id, ((main[msg.chat.id].arr.length > 1) ? outputName(msg) : ('1. ' + main[msg.chat.id].arr[main[msg.chat.id].arr.length-1] + '\n\n')) + 'Введите имена игроков команды ' + main[msg.chat.id].arr[main[msg.chat.id].arr.length-1] + ' в столбик по одному', opts);
}

function randNames (msg) {
  main[msg.chat.id].state = 'qtyPlayers';
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['🚪 Выйти'],
      ],
      resize_keyboard: true
    })
  };
  bot.sendMessage(msg.chat.id, 'Введите количество игроков', opts);
}

function qtyPlayers (msg) {
  if (+msg.text > 100) {
    bot.sendMessage(msg.chat.id, 'Максимальное количество игроков - 100');
    return;
  }
  main[msg.chat.id].game.qtyPlayers = +msg.text;
  let tmpArr = [];
  let tmpTeamName;
  if (main[msg.chat.id].game.qtyPlayers % main[msg.chat.id].game.qtyTeams != 0) {
    let difference = main[msg.chat.id].game.qtyPlayers - (Math.floor(main[msg.chat.id].game.qtyPlayers / main[msg.chat.id].game.qtyTeams)) * main[msg.chat.id].game.qtyTeams;
    for (let i = 0; i < main[msg.chat.id].game.qtyTeams; i++) {
      tmpArr.push((Math.floor(main[msg.chat.id].game.qtyPlayers / main[msg.chat.id].game.qtyTeams)) + ((difference > 0) ? 1 : 0));
      difference--;
      tmpTeamName = avatarF() + ' ' + teamNameF();
      main[msg.chat.id].teams[tmpTeamName] = [];
      main[msg.chat.id].arr.push(tmpTeamName);
      for (let j = 0; j < tmpArr[tmpArr.length - 1]; j++) {
        main[msg.chat.id].teams[tmpTeamName].push(nickNameF());
      }
    }
  } else {
    for (let i = 0; i < main[msg.chat.id].game.qtyTeams; i++) {
      tmpArr.push(main[msg.chat.id].game.qtyPlayers / main[msg.chat.id].game.qtyTeams);
      tmpTeamName = avatarF() + ' ' + teamNameF();
      main[msg.chat.id].teams[tmpTeamName] = [];
      main[msg.chat.id].arr.push(tmpTeamName);
      for (let j = 0; j < tmpArr[tmpArr.length - 1]; j++) {
        main[msg.chat.id].teams[tmpTeamName].push(nickNameF());
      }
    }
  }
  qtyWords(msg);
}

function qtyWords (msg) {
  if (main[msg.chat.id].state === 'nameP') main[msg.chat.id].teams[main[msg.chat.id].arr[main[msg.chat.id].arr.length-1]] = msg.text.split('\n');
  main[msg.chat.id].state = 'qtyWords';
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['🚪 Выйти']
      ],
      resize_keyboard: true
    })
  }
  bot.sendMessage(msg.chat.id, outputName(msg) + 'Введите количество слов для победы', opts);
}

function difficultF (msg) {
  main[msg.chat.id].state = 'step';
  main[msg.chat.id].game.qtyWords = msg.text;
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['😎 Легкий'],
        ['🧐 Умеренный'],
        ['🤯 Мозговой штурм'],
        ['🚪 Выйти']
      ],
      resize_keyboard: true
    })
  }
  bot.sendMessage(msg.chat.id, 'Выберете уровень сложности', opts);
}

function pickDifficult (msg) {
  switch (msg.text) {
    case '😎 Легкий': main[msg.chat.id].variableOfDiff = 0; break;
    case '🧐 Умеренный': main[msg.chat.id].variableOfDiff = 1; break;
    case '🤯 Мозговой штурм': main[msg.chat.id].variableOfDiff = 2; break;
  }
  preStepF(msg);
}

function preStepF (msg) {
  main[msg.chat.id].game.tm = {};
  for (let key in main[msg.chat.id].teams) {
    main[msg.chat.id].game.tm[key] = {counter: 0};
    main[msg.chat.id].tmpLinuxObj[key] = [];
    for (let i = 0; i < ((100 / +main[msg.chat.id].game.qtyTeams) / +main[msg.chat.id].teams[key].length); i++) {
      main[msg.chat.id].tmpLinuxObj[key] = main[msg.chat.id].tmpLinuxObj[key].concat(main[msg.chat.id].teams[key]);
    }
  }
  for (let i = 0; i < 100; i++) {
    for (let key in main[msg.chat.id].tmpLinuxObj) {
      main[msg.chat.id].line.push('Готовятся *' + key + '*\nОбъясняет *' + main[msg.chat.id].tmpLinuxObj[key][i] + '*');
    }
  }
  stepF(msg);
}

function stepF (msg) {
  main[msg.chat.id].state = 'step';
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['🚀 Начать'],
        ['🚪 Выйти']
      ],
      resize_keyboard: true
    }),
    parse_mode: "Markdown"
  }
  bot.sendMessage(msg.chat.id, main[msg.chat.id].line[main[msg.chat.id].current], opts);
}

function roundStart (msg) {
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [
        ['✅ Отгадано'],
        ['❌ Пропустить'],
        ['🚪 Выйти']
      ],
      resize_keyboard: true
    })
  }
  bot.sendMessage(msg.chat.id, '⏳ Время пошло!');
  bot.sendMessage(msg.chat.id, '‼ ' + word(msg), opts);
  setTimeout(roundEndF, main[msg.chat.id].setting.roundTime * 1000, msg);
  for (let i = 20000; i < main[msg.chat.id].setting.roundTime * 1000 - 19000; i = i + 20000) {
    setTimeout(lastTime, i, msg, main[msg.chat.id].setting.roundTime * 1000 - i);
  }
}

function lastTime (msg, time) {
  let timer;
  switch (time) {
    case 20000: timer = '2️⃣0️⃣'; break;
    case 40000: timer = '4️⃣0️⃣'; break;
    case 60000: timer = '6️⃣0️⃣'; break;
    case 80000: timer = '8️⃣0️⃣'; break;
    case 100000: timer = '1️⃣0️⃣0️⃣'; break;
    case 120000: timer = '1️⃣2️⃣0️⃣'; break;
    case 140000: timer = '1️⃣4️⃣0️⃣'; break;
    case 160000: timer = '1️⃣6️⃣0️⃣'; break;
    case 180000: timer = '1️⃣8️⃣0️⃣'; break;
    case 200000: timer = '2️⃣0️⃣0️⃣'; break;
    case 220000: timer = '2️⃣2️⃣0️⃣'; break;
    case 240000: timer = '2️⃣4️⃣0️⃣'; break;
    case 260000: timer = '2️⃣6️⃣0️⃣'; break;
    case 280000: timer = '2️⃣8️⃣0️⃣'; break;
  }
  bot.sendMessage(msg.chat.id, '⏳ Осталось ' + timer + ' секунд');
}

function understand (msg) {
  main[msg.chat.id].game.tm[main[msg.chat.id].line[main[msg.chat.id].current].split('\n')[0].replace(/\*/g, '').slice(10)].counter++;
  bot.sendMessage(msg.chat.id, '‼ ' + word(msg));
}

function skip (msg) {
  main[msg.chat.id].game.tm[main[msg.chat.id].line[main[msg.chat.id].current].split('\n')[0].replace(/\*/g, '').slice(10)].counter--;
  bot.sendMessage(msg.chat.id, '‼ ' + word(msg));
}

function roundEndF (msg) {
  main[msg.chat.id].state = 'endRound';
  if (!main[msg.chat.id].setting.commonWord) {
    bot.sendMessage(msg.chat.id, 'Время вышло!');
  } else {
    bot.sendMessage(msg.chat.id, 'Время вышло! Теперь слово отгадывают все команды');
  }
}

function understandEnd (msg) {
  if (!main[msg.chat.id].setting.commonWord) {
    if (msg.text === '✅ Отгадано') main[msg.chat.id].game.tm[main[msg.chat.id].line[main[msg.chat.id].current].split('\n')[0].replace(/\*/g, '').slice(10)].counter++;
    if (msg.text === '❌ Пропустить') main[msg.chat.id].game.tm[main[msg.chat.id].line[main[msg.chat.id].current].split('\n')[0].replace(/\*/g, '').slice(10)].counter--;
    drawPoints(msg);
  } else {
    main[msg.chat.id].state = 'selectTeam';
    const opts = {
      reply_markup: JSON.stringify({
        keyboard: main[msg.chat.id].arr.map( (value) => [value] ),
        resize_keyboard: true
      })
    }
    bot.sendMessage(msg.chat.id, 'Какая команда отгадала?', opts);
  }
}

function selectTeam (msg) {
  main[msg.chat.id].game.tm[msg.text].counter++;
  drawPoints(msg);
}

function drawPoints (msg) {
  main[msg.chat.id].current++;
  let checkWin = false;
  let str = 'Результаты:';
  for (let key in main[msg.chat.id].game.tm) {
    str += '\n' + main[msg.chat.id].game.tm[key].counter + ' ' + key;
    if (main[msg.chat.id].current % main[msg.chat.id].game.qtyTeams == 0 && main[msg.chat.id].game.tm[key].counter >= main[msg.chat.id].game.qtyWords) checkWin = true;
  }
  if (checkWin) {
    winF(msg);
    bot.sendMessage(msg.chat.id, str);
  } else {
    bot.sendMessage(msg.chat.id, str);
    stepF(msg);
  }
}

function winF (msg) {
  let str = 'Победители:';
  let winPoints = 0;
  for (let key in main[msg.chat.id].game.tm) {
    if (main[msg.chat.id].game.tm[key].counter > winPoints) winPoints = main[msg.chat.id].game.tm[key].counter;
  }
  for (let key in main[msg.chat.id].game.tm) {
    if (main[msg.chat.id].game.tm[key].counter === winPoints) str += '\n' + key + '  🎈';
  }
  str += '\n\n🎉 🎉 🎉';
  const opts = {
    reply_markup: JSON.stringify({
      keyboard: [['🚪 Выйти']],
      resize_keyboard: true
    })
  }
  bot.sendMessage(msg.chat.id, str, opts);
}

function word (msg) {
  let index = Math.floor(Math.random() * (words.word.length / 3));
  index = (Math.floor(words.word.length / 3) * main[msg.chat.id].variableOfDiff) + index;
  return words.word[index];
}

function teamNameF () {
  const index = Math.floor(Math.random() * teamName.teamName.length);
  return teamName.teamName[index];
}

function nickNameF () {
  const index = Math.floor(Math.random() * nickName.nickName.length);
  return nickName.nickName[index];
}

function avatarF () {
  const index = Math.floor(Math.random() * avatar.avatar.length);
  return avatar.avatar[index];
}

// function error (msg) {
//   bot.sendMessage(msg.chat.id, 'Мы не поняли о чем речь');
// }

function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function outputName (msg) {
  let counter = 1;
  let str = '';
  if (main[msg.chat.id].teams[main[msg.chat.id].arr[main[msg.chat.id].arr.length-1]] || main[msg.chat.id].arr.length > 1) {
    for (let key in main[msg.chat.id].teams) {
      str += counter + '. ' + key + '\n';
      if (main[msg.chat.id].teams[key] !== null) str += main[msg.chat.id].teams[key].reduce( (acc, cur) => acc + '\n' + cur );
      counter++;
      str += (main[msg.chat.id].teams[key] == null) ? '\n' : '\n\n';
    }
  }
  return str;
}

