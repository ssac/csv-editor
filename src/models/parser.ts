import {
	parse
} from 'csv-parse/sync';
import {
	stringify
} from 'csv-stringify/sync';
import type {
	Options
} from 'csv-parse';

import File from './file';

import type {
	FileOpts
} from './file';

export const DEFAULT_OPTS: Options = {
	bom: true,
	columns: true,
	skip_empty_lines: true,
	trim: true,
}

// For more parse options: https://github.com/mafintosh/csv-parser
export interface ParserOpts {
	fileOpts: FileOpts
	parserOpts?: Options
}

export default class<T> extends File {
	private parserOpts: Options;

	constructor(args: ParserOpts) {
		super(args.fileOpts);
		this.parserOpts = args.parserOpts ? {...DEFAULT_OPTS,  ...args.parserOpts} : DEFAULT_OPTS;
	}

	public async parseFile(): Promise<T[]> {
		return parse(this.read(), this.parserOpts)
	}

	public async writeFile(rows: T[]) {
		return this.write(stringify(rows, {
			header: true
		}))
	}
}