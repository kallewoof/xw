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

type Element<T> = T | T[];
type StringElement = Element<string>;

const Unwrap: <T>(el?: Element<T>) => T[] = <T>(el?: Element<T>) => el ? el instanceof Array ? el : [el] : [];

interface JMReadingElement {
    reb: string;
    re_pri?: StringElement;
}

interface JMKanjiElement {
    keb: string;
    ke_pri?: StringElement;
}

type Glossary = string | number;

interface JMSense {
    pos: StringElement;
    gloss: Element<Glossary>;
    xref: string;
    misc?: StringElement;
    s_inf?: StringElement;
}

const contains = (s: StringElement | undefined, v: string): boolean => {
    for (const y of Unwrap(s)) {
        if (y === v) return true;
    }
    return false;
}

interface JMEntry {
    ent_seq: number;
    r_ele?: Element<JMReadingElement>;
    k_ele?: Element<JMKanjiElement>;
    sense: Element<JMSense>;
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
        ざ: "ザ",じ: "ジ",ず: "ズ",ぜ: "ゼ",ぞ: "ゾ",
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

const romaji: (s: string) => string = (s: string) => {
    const map: { [type: string]: string } = {
        あ: "a",い: "i",う: "u",え: "e",お: "o",
        ぁ: "a",ぃ: "i",ぅ: "u",ぇ: "e",ぉ: "o",
        ァ: "a",ィ: "i",ゥ: "u",ェ: "e",ォ: "o",
        ゔ: "vu",
        か: "ka",き: "ki",く: "ku",け: "ke",こ: "ko",
        ヵ: "ka",ヶ: "ke",
        が: "ga",ぎ: "gi",ぐ: "gu",げ: "ge",ご: "go",
        さ: "sa",し: "shi",す: "su",せ: "se",そ: "so",
        ざ: "za",ず: "zu",ぞ: "zo",ジ: "ji",ゼ: "ze",
        た: "ta",ち: "chi",つ: "tsu",て: "te",と: "to",
        だ: "da",ぢ: "dzi",づ: "dzu",で: "de",ど: "do",っ: "t",ッ: "t",
        な: "na",に: "ni",ぬ: "nu",ね: "ne",の: "no",
        は: "ha",ひ: "hi",ふ: "fu",へ: "he",ほ: "ho",
        ば: "ba",び: "bi",ぶ: "bu",べ: "be",ぼ: "bo",
        ぱ: "pa",ぴ: "pi",ぷ: "pu",ぺ: "pe",ぽ: "po",
        ま: "ma",み: "mi",む: "mu",め: "me",も: "mo",
        や: "ya",ゆ: "yu",よ: "yo",
        ゃ: "ya",ゅ: "yu",ょ: "yo",
        ャ: "ya",ュ: "yu",ョ: "yo",
        ら: "ra",り: "ri",る: "ru",れ: "re",ろ: "ro",
        わ: "wa", を: "wo",
        ん: "n",
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
        for (const s of sense) {
            if (s.gloss) hasgloss = true;
        }
        if (el.reb && hasgloss && (!kel || kel.ke_pri || el.re_pri)) {
            const raw = el.reb;
            const rom = romaji(raw);
            if (raw.length > 10) continue;
            const answer = conv(raw);
            const moddedr = raw.replace(/[ぁぃぅぇぉァィゥェォヵヶっッゃゅょャュョ]/g, "");
            const moddeda = conv(moddedr);
            if (moddedr === moddeda) continue; // no katakana stuff
            let gloss = "";
            let colloquial = true;
            for (const s of sense) {
                colloquial = colloquial && contains(s.misc, '&col;');
                if (s.gloss) {
                    let entry = '';
                    for (const e of Unwrap(s.gloss)) {
                        if (typeof e === "string" &&
                            e.length >= rom.length &&
                            (e === rom ||
                             e.toLowerCase().substr(0, rom.length + 1) === `${rom} `)) {
                            console.error(`skipping entry ${e} for romaji ${rom} (${raw})`);
                        } else {
                            entry += `${entry === "" ? "" : "; "}${e}`;
                        }
                    }
                    if (s.s_inf) {
                        const inf = Unwrap(s.s_inf).filter((v: string) => {
                            if (v !== romaji(v)) return false;
                            for (const k of Unwrap(e.k_ele)) {
                                if (v.indexOf(k.keb) > -1) return false;
                            }
                            return true;
                        });
                        if (inf.length > 0) {
                            entry += "【" + inf.join('; ') + "】";
                        }
                    }
                    if (entry === '') continue;
                    entry = (contains(s.pos, '&n-suf;') ? '(名詞・敬称) ' : '') +
                            (contains(s.pos, '&suf;') ? '(敬称) ' : '') +
                            (contains(s.misc, '&hon;') ? '(敬語) ' : '') + entry;
                    gloss += (gloss === '' ? '' : '; ') + entry;
                }
            }
            if (colloquial || gloss === '' || answer.length === 1) continue;
            const question = typeof gloss === "string" ? conv(gloss) : gloss;
            console.log(`${answer}\n${question}`);
        }
    }
}
