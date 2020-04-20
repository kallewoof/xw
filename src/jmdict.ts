import * as fs from 'fs';

const parser = require('fast-xml-parser');
require('he');

const args = process.argv.slice(2);

if (args.length !== 1) {
    console.log('syntax: <input-file>');
    process.exit(1);
}

const inputFile = args[0];

const data = fs.readFileSync(inputFile).toString('utf-8');

interface JMReadingElement {
    reb: string;
    re_pri?: string | string[];
}

interface JMKanjiElement {
    keb: string;
    ke_pri?: string | string[];
}

type Glossary = string | number;

interface JMSense {
    pos: string | string[];
    gloss: Glossary | Glossary[];
    xref: string;
    misc?: string | string[];
}

const contains = (s: string | string[] | undefined, v: string): boolean => {
    if (!s) return false;
    if (s instanceof Array) {
        for (const y of s) {
            if (y === v) return true;
        }
        return false;
    }
    return v == s;
}

interface JMEntry {
    ent_seq: number;
    r_ele?: JMReadingElement | JMReadingElement[];
    k_ele?: JMKanjiElement | JMKanjiElement[];
    sense: JMSense | JMSense[];
}

interface JMDict {
    JMdict: {
        entry: JMEntry[],
    };
}

const ob: JMDict = parser.parse(data);

const entries = ob.JMdict.entry;

const conv: (s: string) => string = (s: string) => {
    const map: { [type: string]: string } = {
        あ: "ア",い: "イ",う: "ウ",え: "エ",お: "オ",
        ぁ: "ア",ぃ: "イ",ぅ: "ウ",ぇ: "エ",ぉ: "オ",
        ァ: "ア",ィ: "イ",ゥ: "ウ",ェ: "エ",ォ: "オ",
        ゔ: "ヴ",
        か: "カ",き: "キ",く: "ク",け: "ケ",こ: "コ",
        ヵ: "カ",ヶ: "ケ",
        が: "ガ",ぎ: "ギ",ぐ: "グ",げ: "ゲ",ご: "ゴ",
        さ: "サ",し: "シ",す: "ス",せ: "セ",そ: "ソ",
        ざ: "じ",ず: "ぜ",ぞ: "ザ",ジ: "ズ",ゼ: "ゾ",
        た: "タ",ち: "チ",つ: "ツ",て: "テ",と: "ト",
        だ: "ダ",ぢ: "ヂ",づ: "ヅ",で: "デ",ど: "ド",っ: "ツ",ッ: "ツ",
        な: "ナ",に: "ニ",ぬ: "ヌ",ね: "ネ",の: "ノ",
        は: "ハ",ひ: "ヒ",ふ: "フ",へ: "ヘ",ほ: "ホ",
        ば: "バ",び: "ビ",ぶ: "ブ",べ: "ベ",ぼ: "ボ",
        ぱ: "パ",ぴ: "ピ",ぷ: "プ",ぺ: "ペ",ぽ: "ポ",
        ま: "マ",み: "ミ",む: "ム",め: "メ",も: "モ",
        や: "ヤ",ゆ: "ユ",よ: "ヨ",
        ゃ: "ヤ",ゅ: "ユ",ょ: "ヨ",
        ャ: "ヤ",ュ: "ユ",ョ: "ヨ",
        ら: "ラ",り: "リ",る: "ル",れ: "レ",ろ: "ロ",
        わ: "ワ", を: "ヲ",
        ん: "ン",
    };
    let t: string = '';
    for (const ch of s) {
        t += ch in map ? map[ch] : ch;
    }
    return t.replace(/&amp;/g,"&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

for (const e of entries) {
    if (e.r_ele && e.sense) {
        const kel: JMKanjiElement | undefined = e.k_ele instanceof Array ? e.k_ele[0] : e.k_ele;
        const el: JMReadingElement = e.r_ele instanceof Array ? e.r_ele[0] : e.r_ele;
        const sense: JMSense[] = e.sense instanceof Array ? e.sense : [e.sense];
        let hasgloss = false;
        for (const s of sense) if (s.gloss) hasgloss = true;
        if (el.reb && hasgloss && (!kel || kel.ke_pri || el.re_pri)) {
            const raw = el.reb;
            if (raw.length > 10) continue;
            const answer = conv(raw);
            const moddedr = raw.replace(/[ぁぃぅぇぉァィゥェォヵヶっッゃゅょャュョ]/g, "");
            const moddeda = conv(moddedr);
            console.error(`${moddedr} vs ${moddeda} => ${moddedr === moddeda}`);
            if (moddedr === moddeda) continue; // no katakana stuff
            
            let gloss = "";
            for (const s of sense) {
                if (s.gloss) {
                    gloss += (gloss === '' ? '' : '; ') +
                        (contains(s.pos, 'n-suf') ? '(名詞・敬称) ' : '') +
                        (contains(s.pos, 'suf') ? '(敬称) ' : '') +
                        (contains(s.misc, 'hon') ? '(敬語) ' : '') +
                        (s.gloss instanceof Array ? s.gloss.join('; ') : s.gloss);
                }
            }
            if (answer.length === 1) continue;
            const question = typeof gloss === "string" ? conv(gloss) : gloss;
            console.log(`${answer}\n${question}`);
        }
    }
}
