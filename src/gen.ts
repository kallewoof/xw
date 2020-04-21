import * as entry from './entry';
import * as fs from 'fs';
import * as readline from 'readline';

const args = process.argv.slice(2);

if (args.length !== 3) {
    console.log('syntax: <input-file> <width> <height>');
    process.exit(1);
}

const inputFile = args[0];
// const outputFile = './gen.out';
const width = Number.parseInt(args[1], 10) - 0;
const height = Number.parseInt(args[2], 10) - 0;

if (width < 1 || height < 1 || width > 100 || height > 100) {
    console.log(`dimensions invalid: ${width} x ${height} (axes must be in range 1..100)`);
    process.exit(2);
}

const main = async () => {
    // read from input file
    const stream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: stream,
        crlfDelay: Infinity
    });

    let nextWord: string | undefined;
    for await (const line of rl) {
        if (nextWord) {
            if (nextWord.length > 10) console.log(`warning: long word: ${nextWord}`);
            entry.Add(new entry.Entry(nextWord, line));
            nextWord = undefined;
        } else {
            nextWord = line;
        }
    }

    for (const n of Object.keys(entry.Map)) {
        console.log(`${n} letter words:`);
        for (const e of entry.Map[n as unknown as number]) {
            console.log(`- ${e.word}: ${e.description}`);
        }
    }

    const g = new entry.Board(width, height);
    if (!g.solve()) {
        console.log('generation failed!');
        return Promise.reject();
    }

    let quizlist: ([number, number])[] = [];
    let list_horiz: string = `<ul>`;
    let list_vert: string = `<ul>`;
    let js_horiz: string = "";
    let js_vert: string = "";
    let js_letters_horiz: string = "";
    let js_letters_vert: string = "";
    let js_x: string = "";
    let js_y: string = "";
    let js_xy_ans: string = "";
    let table: string = `<table cellspacing="0">`;
    for (let y = 0; y < height; ++y) {
        table += `<tr class="${y & 1 ? "odd" : "even"}">\n`;
        js_xy_ans += `${y}: {`;
        for (let x = 0; x < width; ++x) {
            if (g.matrix.m[y][x] === '#') {
                table += '\t<td class="cell-wall" style="height: 54px;"></td>\n';
                continue;
            }
            js_xy_ans += `${x}: "${g.matrix.m[y][x]}",`;
            if (g.quiz.get(x, y, true) || g.quiz.get(x, y, false)) {
                let quiz = g.quiz.get(x, y, true);
                quizlist.push([x, y]);
                const index = quizlist.length;
                js_x += `${index}: ${x}, `;
                js_y += `${index}: ${y}, `;
                if (quiz) {
                    list_horiz += `<li onclick="javascript:fill_pad(${index});">${index}: ${quiz.description}</li>`;
                    js_horiz += `${index}: "${quiz.description.replace(/"/g, '\\"')}", `;
                    js_letters_horiz += `${index}: ${quiz.word.length}, `;
                }
                quiz = g.quiz.get(x, y, false);
                if (quiz) {
                    list_vert += `<li onclick="javascript:fill_pad(${index});">${index}: ${quiz.description}</li>`;
                    js_vert += `${index}: "${quiz.description.replace(/"/g, '\\"')}", `;
                    js_letters_vert += `${index}: ${quiz.word.length}, `;
                }
                table += `\t<td id="td${x}_${y}" onclick="javascript:fill_pad(${index});" class="cell-index" style="height: 54px;"><span class="index">${index}</span><span id="c${x}_${y}" class="letter">　</span></td>\n`;
                continue;
            }
            table += `\t<td id="td${x}_${y}" class="cell-blank" style="height: 54px;"><span id="c${x}_${y}" class="letter">　</span></td>\n`;
        }
        table += "</tr>\n";
        js_xy_ans += `},`;
    }
    list_horiz += '</ul>\n';
    list_vert += '</ul>\n';
    table += `</table>`
    const html = `<html>
    <head>
    <script>
    function conv(s) {
        var map = {
            あ: "ア",い: "イ",う: "ウ",え: "エ",お: "オ",
            ぁ: "ア",ぃ: "イ",ぅ: "ウ",ぇ: "エ",ぉ: "オ",
            ァ: "ア",ィ: "イ",ゥ: "ウ",ェ: "エ",ォ: "オ",
            か: "カ",き: "キ",く: "ク",け: "ケ",こ: "コ",
            ヵ: "カ",ヶ: "ケ",
            が: "ガ",ぎ: "ギ",ぐ: "グ",げ: "ゲ",ご: "ゴ",
            さ: "サ",し: "シ",す: "ス",せ: "セ",そ: "ソ",
            じ: "ジ",
            ま: "マ",み: "ミ",む: "ム",め: "メ",も: "モ",
            な: "ナ",に: "ニ",ぬ: "ヌ",ね: "ネ",の: "ノ",
            ら: "ラ",り: "リ",る: "ル",れ: "レ",ろ: "ロ",
            は: "ハ",ひ: "ヒ",ふ: "フ",へ: "ヘ",ほ: "ホ",
            ば: "バ",び: "ビ",ぶ: "ブ",べ: "ベ",ぼ: "ボ",
            ぱ: "パ",ぴ: "ピ",ぷ: "プ",ぺ: "ペ",ぽ: "ポ",
            た: "タ",ち: "チ",つ: "ツ",て: "テ",と: "ト",
            だ: "ダ",ぢ: "ヂ",づ: "ヅ",で: "デ",ど: "ド",っ: "ツ",ッ: "ツ",
            や: "ヤ",ゆ: "ユ",よ: "ヨ",
            ゃ: "ヤ",ゅ: "ユ",ょ: "ヨ",
            ャ: "ヤ",ュ: "ユ",ョ: "ヨ",
            ゔ: "ヴ",
            を: "ヲ",ん: "ン",
        };
        var t = '';
        for (var ch of s) {
            t += ch in map ? map[ch] : ch;
        }
        return t.replace(/&amp;/,"&").replace(/&lt;/, "<").replace(/&gt;/, ">");
    }
    var actual = {${js_xy_ans}};
    var letters = {horiz: {${js_letters_horiz}}, vert: {${js_letters_vert}}};
    var coords = {x: {${js_x}}, y: {${js_y}}};
    function check_answers() {
        for (var x = 0; x < ${width}; ++x) {
            for (var y = 0; y < ${height}; ++y) {
                if (actual[y][x]) {
                    var answer = document.getElementById('c' + x + '_' + y).innerHTML.trim();
                    var el = document.getElementById('td' + x + '_' + y);
                    var correct = actual[y][x] == answer;
                    el.classList.remove(correct ? 'wrong' : 'correct');
                    el.classList.add(correct ? 'correct' : 'wrong');
                }
            }
        }
    }
    function get(index, horiz) {
        var x = coords.x[index];
        var y = coords.y[index];
        var len = letters[horiz ? 'horiz' : 'vert'][index];
        var rv = '';
        if (horiz) {
            for (var i = x; i < x + len; ++i) {
                var ch = document.getElementById('c' + i + '_' + y).innerHTML;
                rv += ch == '　' ? '' : ch;
            }
        } else {
            for (var i = y; i < y + len; ++i) {
                var ch = document.getElementById('c' + x + '_' + i).innerHTML;
                rv += ch == '　' ? '' : ch;
            }
        }
        return rv;
    }
    function set(index, horiz, s) {
        var x = coords.x[index];
        var y = coords.y[index];
        var len = letters[horiz ? 'horiz' : 'vert'][index];
        if (horiz) {
            for (var i = 0; i < len; ++i) {
                document.getElementById('c' + (x + i) + '_' + y).innerHTML = s[i];
            }
        } else {
            for (var i = 0; i < len; ++i) {
                document.getElementById('c' + x + '_' + (y + i)).innerHTML = s[i];
            }
        }
    }
    function insert(index, horiz) {
      var answer = conv(document.getElementById('in_' + (horiz ? 'horiz' : 'vert')).value);
      if (answer.length != letters[horiz ? 'horiz' : 'vert'][index]) {
          return false;
      }
      set(index, horiz, answer);
      document.getElementById('in_' + (horiz ? 'horiz' : 'vert')).value = answer;
      var other = document.getElementById('in_' + (horiz ? 'vert' : 'horiz'));
      if (other) other.value = get(index, !horiz);
    }
    function fill_pad(index) {
        var horiz = {
            ${js_horiz}
        };
        var vert = {
            ${js_vert}
        };
        var pad = document.getElementById('pad');
        var newcontent = '';
        if (horiz[index]) {
            var curr = get(index, true);
            newcontent += '<p><strong>横</strong> ' + index + ': ' + horiz[index] + '</p>' + '<form onsubmit="javascript:insert(' + index + ', true); return false;"><input type="text" id="in_horiz" value="' + (curr || '') + '"></input></form>';
        }
        if (vert[index]) {
            var curr = get(index, false);
            newcontent += '<p><strong>縦</strong> ' + index + ': ' + vert[index] + '</p>' + '<form onsubmit="javascript:insert(' + index + ', false); return false;"><input type="text" id="in_vert" value="' + (curr || '') + '"></input></form>';
        }
        pad.innerHTML = newcontent;	
        document.getElementById(horiz[index] ? 'in_horiz' : 'in_vert').focus();
    }
    </script>
    <style>
    table {
        background: #555;
        border-spacing: 1px;
    }
    td {
        spacing: 0px;
        height: 54px;
        width: 54px;
        background: #fff;
    }
    td.correct {
        background: #cfc;
    }
    td.wrong {
        background: #fcc;
    }
    .cell-wall {
        background: #999;
    }
    span.index {
        float: left;
        margin-left: 0px;
        margin-top: -15px;
        font-size: 8pt;
    </style>
    </head>
    <body>
    ${table}
    <br/>
    <div id="pad">
    </div>
    <table style="width: 80%;"><tr><td style="vertical-align:top; width: 50%;"><center>横</center><br/>${list_horiz}</td><td style="vertical-align: top; width: 50%;"><center>縦</center><br/>${list_vert}</td></tr></table>
    <br/>
    <div>
    <button type="button" onclick="javascript:check_answers();">確認する</button><br/><br/>
    </div>
    </body>
    </html>`;
    console.log(`html = \n${html}`);

    return Promise.resolve();
}

main();
