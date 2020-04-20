import * as assert from 'assert';

export class Entry {
    public word: string;
    public description: string;
    constructor(word: string, description: string) {
        this.word = word;
        this.description = description;
    }
}

export interface Predicate {
    index: number;
    char: string;
}

export const Map: { [type: number]: Entry[] } = {};

export const Add = (e: Entry) => {
    const len = e.word.length;
    if (len in Map) Map[len].push(e); else Map[len] = [e];
};

export const LS = (s: string, len: number) => {
    while (s.length < len) s = '　' + s;
    return s;
}

export const Random = (max: number) => Math.floor(Math.random() * Math.floor(max));

export const Blur = (center: number, deviation: number) => Math.round(center + 0.5 + Random(deviation * 2) - deviation);

export const Sample = (length: number) => Map[length][Random(Map[length].length)];

export const Filter: (list: Entry[], filters: Predicate[]) => Entry[] = (list: Entry[], filters: Predicate[]) =>
    list.filter((value: Entry) => {
        // console.log(`filtering ${value.word} (#${value.word.length})`);
        for (const f of filters) {
            if (value.word.length === f.index && f.char !== '#') {
                // console.log(`- bad (len = ${f.index} and ${f.char} !== '#')`);
                return false;
            }
            if (value.word.length <= f.index) continue;
            if (value.word[f.index] !== f.char) {
                // console.log(`- bad (word[${f.index}] == ${value.word[f.index]}, must be ${f.char})`);
                return false;
            }
        }
        return true;
    });

declare global {
    interface Array<T> {
        sample() : T | undefined;
    }
}

Array.prototype.sample = function () {
    if (this.length === 0) return undefined;
    const r = Random(this.length);
    return this.splice(r, 1)[0];
};

export class Operation {
    static counter: number = 0;
    id: number;
    x: number;
    y: number;
    h: boolean;
    s: string;
    constructor(x: number, y: number, h: boolean, s: string) {
        this.id = ++Operation.counter;
        this.x = x;
        this.y = y;
        this.h = h;
        this.s = s;
    }
}

export class Matrix {
    public width: number;
    public height: number;
    public m: string[];
    public ops: Operation[];
    public unfilled: number;
    constructor(width: number, height: number) {
        this.width = width;
        this.height = height;
        this.unfilled = width * height;
        this.ops = [];
        this.m = [];
        let row: string = '';
        for (let i = 0; i < width; ++i) row += ' ';
        for (let i = 0; i < height; ++i) {
            this.m.push(row);
        }
    }

    get(x: number, y: number, h: boolean): string {
        if (h) return this.m[y].substr(x);
        let rv: string = '';
        for (let i = y; i < this.height; ++i) {
            rv += this.m[i][x];
        }
        return rv;
    }

    options(x: number, y: number, h: boolean): number[] {
        let rv: number[] = [];
        const s = this.get(x, y, h);
        // console.log(`options for ${x}, ${y}, ${h}: "${s}" (#${s.length})`);
        for (let i = 0; i < s.length; ++i) {
            if (s[i] === '#') {
                // case 1: rv empty; no action
                // case 2: rv has 1 single entry for i-1 -> [i]; we want to keep the entry; no action
                // case 3: rv has 2+ entries; this means we have an entry for i-2 -> [i-1]; this would result in
                //         a double wall, i.e. #word##; we disallow this
                if (rv.length > 1) rv.splice(rv.length - 2, 1);
                break;
            }
            rv.push(i + 1);
        }
        return rv;
    }

    predicates(x: number, y: number, h: boolean): Predicate[] {
        let rv: Predicate[] = [];
        const s = this.get(x, y, h);
        let index: number;
        for (index = 0; index < s.length; ++index) {
            const char = s[index];
            if (char === ' ') continue;
            if (char === '#') break;
            rv.push({ index, char });
        }
        rv.push({ index, char: '#' }); // limit on length; for invalid locations, this results in 'must be 0 letters'
        return rv;
    }

    fits(x: number, y: number, h: boolean, s: string): boolean {
        const g = this.get(x, y, h);
        // console.log(`checking fits for "${s}" (#${s.length}) in "${g}" (#${g.length}) @ ${x}, ${y}, ${h}`);
        if (g.length < s.length) {
            // console.log('glen < slen');
            return false;
        }
        if (g.length > s.length && g[s.length] !== ' ' && g[s.length] !== '#') {
            // console.log(`g[${s.length}]=${g[s.length]} != ' ' / '#'`);
            return false; // must end with a wall
        }
        if (h ? x > 0 : y > 0) {
            const ch = this.m[y - (h ? 0 : 1)][x - (h ? 1 : 0)];
            if (ch !== '#' && ch !== ' ') {
                // console.log(`${ch} (${x - (h ? 1 : 0)}, ${y - (h ? 0 : 1)}) != '#' / ' '`);
                return false; // must be able to put a wall behind the word
            }
        }
        for (let i = 0; i < s.length; ++i) {
            const ch = g[i];
            if (ch !== s[i] && ch !== ' ') {
                // console.log(`mismatch at index ${i}: ${ch} != ${s[i]} / ' '`);
                return false; // letter mismatch, and not a wildcard
            }
        }
        return true;
    }

    holes(s: string): number {
        let rv: number = 0;
        for (const ch of s) if (ch === ' ') ++rv;
        return rv;
    }

    backpedal(x: number, y: number, h: boolean): [number, number] {
        // step back until we hit a wall, or a space
        // 1. |foo_  : step back all the way to the wall, i.e. |_f_oo
        // 2. |foo _ : keep current position
        // 3. foo#_  : keep current position
        // 4. foo# _ : step back to the wall --> foo#_
        // 5. |_     : stay
        // 6.   _    : (multiple spaces available) step back arbitrary steps
        if (h) {
            // case 1
            while (x > 0 && this.m[y][x - 1] !== '#' && this.m[y][x - 1] !== ' ') --x;
            // cases 3, 5
            if (x === 0 || this.m[y][x - 1] === '#') return [x, y];
            // narrowed down to ' ' case
            // case 6
            while (x > 1 && this.m[y][x - 2] === ' ' && Random(2) === 1) --x;
            // case 4
            if (x > 1 && this.m[y][x - 2] === '#') return [x - 1, y];
        } else {
            // case 1
            while (y > 0 && this.m[y - 1][x] !== '#' && this.m[y - 1][x] !== ' ') --y;
            // cases 3, 5
            if (y === 0 || this.m[y - 1][x] === '#') return [x, y];
            // narrowed down to ' ' case
            // case 6
            while (y > 1 && this.m[y - 2][x] === ' ' && Random(2) === 1) --y;
            // case 4
            if (y > 1 && this.m[y - 2][x] === '#') return [x, y - 1];
        }
        // case 5
        return [x, y];
    }

    set(x: number, y: number, h: boolean, s: string, verify: boolean = true, regop: boolean = true): number {
        // console.log(`SET ${x}, ${y}, ${h} = "${s}"`)
        let counted_unfilled = 0;
        for (let i = 0; i < this.width; ++i) {
            for (let j = 0; j < this.height; ++j) {
                counted_unfilled += this.m[j][i] === ' ' ? 1 : 0;
            }
        }
        if (counted_unfilled !== this.unfilled) {
            console.log(`unfilled count is invalid on entry to set(); ${this.unfilled} when the actual value is ${counted_unfilled}\n${this.to_string()}`);
        }
        assert(counted_unfilled === this.unfilled);
        if (verify) {
            assert(this.fits(x, y, h, s));
        }
        let old: string = '';
        if (h) {
            if (x > 0 && s[0] !== '#' && s[0] !== ' ') {
                --x;
                s = '#' + s;
            }
            if (x + s.length < this.width && s[s.length - 1] !== '#' && s[s.length - 1] !== ' ') {
                s += '#';
            }
            const m = this.m[y];
            old = m.substr(x, s.length);
            const prefix = m.substr(0, x);
            const suffix = m.substr(x + s.length);
            this.m[y] = `${prefix}${s}${suffix}`;
        } else {
            if (y > 0 && s[0] !== '#' && s[0] !== ' ') {
                --y;
                s = '#' + s;
            }
            if (y + s.length < this.height && s[s.length - 1] !== '#' && s[s.length - 1] !== ' ') {
                s += '#';
            }
            for (let i = 0; i < s.length; ++i) {
                const m = this.m[y + i];
                old += m[x];
                this.m[y + i] = m.substr(0, x) + s[i] + m.substr(x + 1);
            }
        }
        this.unfilled += this.holes(s) - this.holes(old);
        counted_unfilled = 0;
        for (let i = 0; i < this.width; ++i) {
            for (let j = 0; j < this.height; ++j) {
                counted_unfilled += this.m[j][i] === ' ' ? 1 : 0;
            }
        }
        if (counted_unfilled !== this.unfilled) {
            console.log(`upon replacing ${old} [${this.holes(old)} holes] with ${s} [${this.holes(s)} holes] @ ${x}, ${y}, ${h}, we miscalculated the unfilled count as ${this.unfilled} when the actual value is ${counted_unfilled}\n${this.to_string()}`);
        }
        assert(counted_unfilled === this.unfilled);

        if (regop) {
            const op = new Operation(x, y, h, old);
            this.ops.push(op);
            return op.id;
        }
        return -1;
    }

    undo(id: number): void {
        while (this.ops.length > 0) {
            const op = this.ops.pop()!;
            this.set(op.x, op.y, op.h, op.s, false, false);
            if (op.id === id) return;
        }
        throw new Error(`undo failed to find id ${id}`);
    }

    jp_num(n: number): string {
        if (n === 0) return "０";
        let rv = '';
        while (n > 0) {
            rv = "０１２３４５６７８９"[n % 10] + rv;
            n = Math.trunc(n / 10);
        }
        return rv;
    }

    to_string(): string {
        const lead = 1 + Math.ceil(Math.log10(1 + this.height));
        let hf = LS(' 　', lead);
        for (let i = 0; i < this.width; ++i) {
            hf += `${"０１２３４５６７８９"[i % 10]}`;
        }
        hf += '\n';
        let rv = hf;
        for (let i = 0; i < this.height; ++i) {
            rv += `${LS(' ' + this.jp_num(i), lead)} ${this.m[i].replace(/#/g,"＃").replace(/ /g,"　")} ${this.jp_num(i)}\n`;
        }
        return rv + hf;
    }
}

export class Quiz {
    public entrymap: { [type: number]: { [ type: number]: [Entry | null, Entry | null] }};
    public wordmap: { [type: string]: boolean };
    constructor() {
        this.entrymap = {};
        this.wordmap = {};
    }
    clear() {
        this.entrymap = {};
        this.wordmap = {};
    }
    set(x: number, y: number, horiz: boolean, e: Entry): void {
        this.wordmap[e.word] = true;
        if (!(y in this.entrymap)) this.entrymap[y] = {};
        if (!(x in this.entrymap[y])) this.entrymap[y][x] = [null, null];
        this.entrymap[y][x][horiz ? 1 : 0] = e;
    }
    unset(x: number, y: number, horiz: boolean, e: Entry): void {
        delete this.wordmap[e.word];
        this.entrymap[y][x][horiz ? 1 : 0] = null;
    }
    get(x: number, y: number, horiz: boolean): Entry | null {
        if (!(y in this.entrymap) ||
            !(x in this.entrymap[y])) return null;
        return this.entrymap[y][x][horiz ? 1 : 0];
    }
}

class PositionedEntryMap {
    public map: {
        [type: number]: {
            [type: number]: {
                [type: number]: {
                    [type: string]: boolean
                }
            }
        }
    }
    constructor() {
        this.map = {};
    }
    contains(x: number, y: number, h: boolean, s: string) {
        return (
            x in this.map &&
            y in this.map[x] &&
            (h ? 1 : 0) in this.map[x][y] &&
            s in this.map[x][y][h ? 1 : 0]
        );
    }
    insert(x: number, y: number, h: boolean, s: string) {
        if (!(x in this.map)) this.map[x] = {};
        if (!(y in this.map[x])) this.map[x][y] = {};
        const hn = h ? 1 : 0;
        if (!(hn in this.map[x][y])) this.map[x][y][hn] = {};
        this.map[x][y][hn][s] = true;
    }
}

class MatrixEntry {
    public id: number;
    public e: Entry;
    public x: number;
    public y: number;
    public h: boolean;
    constructor(x: number, y: number, h: boolean, e: Entry, id: number) {
        this.x = x;
        this.y = y;
        this.h = h;
        this.e = e;
        this.id = id;
    }
    to_string(): string {
        return `${this.e.word} @ ${this.x}, ${this.y} ${this.h ? "-" : "|"}`;
    }
}

export class Board {
    public matrix: Matrix;
    public quiz: Quiz;
    public entries: MatrixEntry[];
    constructor(width: number, height: number) {
        this.matrix = new Matrix(width, height);
        this.quiz = new Quiz();
        this.entries = [];
    }
    rewind(id: number): void {
        while (this.entries.length > 0) {
            const e = this.entries.pop()!;
            this.quiz.unset(e.x, e.y, e.h, e.e);
            if (e.id === id) break;
        }
        this.matrix.undo(id);
    }
    solve(): boolean {
        let failures = 0;
        while (this.matrix.unfilled > 0) {
            const w = this.matrix.width;
            const h = this.matrix.height;
            let x = Random(w);
            let y = Random(h);
            let iter;
            for (iter = 0; iter < 100; ++iter) {
                let ctr = 0;
                while (this.matrix.m[y][x] !== ' ') {
                    ++ctr;
                    if (ctr > w * h) throw new Error('matrix seems to be full');
                    ++x;
                    if (x >= w) {
                        x = 0;
                        y = (y + 1) % h;
                    }
                }
                const horiz = Random(2) === 1;
                [x, y] = this.matrix.backpedal(x, y, horiz);
                if (this.fill(x, y, horiz, new PositionedEntryMap())) {
                    break;
                }
            }
            if (iter === 100) {
                ++failures;
                console.log(`failing to fill; undoing last ${failures} entr${failures === 1 ? "y" : "ies"}`);
                for (let i = 0; this.entries.length > 0 && i < failures; ++i) {
                    const last = this.entries.pop()!;
                    this.matrix.undo(last.id);
                    this.quiz.unset(last.x, last.y, last.h, last.e);
                    console.log(`- ${last.to_string()}:\n${this.matrix.to_string()}`)
                }
                if (this.entries.length === 0) failures = 0; // we don't wanna keep eradicating every attempted instance
            }
        }
        if (this.matrix.unfilled === 0) {
            console.log(`final matrix = \n${this.matrix.to_string()}`);
            for (const y of Object.keys(this.quiz.entrymap)) {
                const ymap = this.quiz.entrymap[y as unknown as number];
                for (const x of Object.keys(ymap)) {
                    const pair = ymap[x as unknown as number];
                    if (pair[0]) console.log(`- ${x},${y} (|): ${pair[0].description} (${pair[0].word})`);
                    if (pair[1]) console.log(`- ${x},${y} (-): ${pair[1].description} (${pair[1].word})`);
                }
            }
            return true;
        }
        return this.matrix.unfilled === 0;
    }
    fill(x: number, y: number, horiz: boolean, pem: PositionedEntryMap): boolean {
        const predicates = this.matrix.predicates(x, y, horiz);
        let options = this.matrix.options(x, y, horiz);
        const w = this.matrix.width;
        const h = this.matrix.height;
        // console.log(`filling ${x}, ${y} ${horiz ? '-' : '|'} with ${options.length} option(s), ${predicates.length} predicate(s)`);
        while (options.length > 0) {
            const option: number = options.sample()!;
            // console.log(`option ${option}`);
            if (!(option in Map)) continue;
            let applicable = Filter(Map[option], predicates);
            // console.log(`applicable ${applicable.length}`);
            while (applicable.length > 0) {
                const e = applicable.sample()!;
                // console.log(`- testing ${e.word}`);
                if (e.word in this.quiz.wordmap) continue;
                if (pem.contains(x, y, horiz, e.word)) continue;
                pem.insert(x, y, horiz, e.word);
                const id = this.matrix.set(x, y, horiz, e.word);
                this.quiz.set(x, y, horiz, e);
                const me = new MatrixEntry(x, y, horiz, e, id);
                this.entries.push(me);
                console.log(`added ${me.to_string()}:\n${this.matrix.to_string()}`)
                // we may need to fill the opposite direction as well, if there's at least one letter "above"/"left" or "below"/"right"; if there isn't, e.g. the spaces are empty, and/or walled, we don't need (but still attempt) to fill
                const horiz2 = !horiz;
                // console.log(`scanning over ${x}, ${y} .. ${horiz ? x + e.word.length - 1 : x}, ${horiz ? y : y + e.word.length - 1}`);
                let ids: [number, number][] = [];
                for (let i = 0; i < e.word.length; ++i) {
                    // console.log(`- ${e.word}: i = ${i} / ${e.word.length}`);
                    const startx = horiz ? x + i : x;
                    const starty = horiz ? y : y + i;
                    const [x2, y2] = this.matrix.backpedal(startx, starty, horiz2);
                    if (this.quiz.get(x2, y2, horiz2)) continue;
                    if (horiz2 ? startx === w - 1 : starty === h - 1) continue;
                    let must = x2 != startx || y2 != starty;
                    // console.log(`checking ${x2},${y2} (${must ? "must" : "optional"})`);
                    if (!must && !(horiz2 ? startx + 1 == w : starty + 1 == h)) {
                        // backpedaling kept us at the same spot, and we are not against the wall (forward-wise)...
                        // ... if there is a letter ahead of us, we must succeed with the second fill
                        const ch = this.matrix.m[starty + (horiz2 ? 0 : 1)][startx + (horiz2 ? 1 : 0)];
                        must = ch !== '#';
                        // console.log(`must -> ${must ? "must" : "optonal"}; matrix[${starty + (horiz2 ? 0 : 1)}][${startx + (horiz2 ? 1 : 0)}] == ${ch}`);
                    }
                    if (!must) continue;
                    if (this.fill(x2, y2, horiz2, pem)) {
                        ids.push([i - 1, this.entries[this.entries.length - 1].id]);
                    } else {
                        // throw new Error("failed fill");
                        if (ids.length > 0) {
                            const [oldi, oldid] = ids.pop()!;
                            i = oldi;
                            this.rewind(oldid);
                        } else {
                            // undo above fill as well
                            this.rewind(id);
                            return false;
                        }
                    }
                }
                return true;
            }
        }
        return false;
    }
}
