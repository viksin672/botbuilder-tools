import * as program from 'commander';
import * as chalk from 'chalk';
import * as fs from 'fs-extra';
import * as getStdin from 'get-stdin';
import { BotConfig, ServiceType } from './BotConfig';
import { Enumerable, List, Dictionary } from 'linq-collections';
import { uuidValidate } from './utils';
import { IConnectedService, ILuisService, IDispatchService, IAzureBotService, IBotConfig, IEndpointService, IQnAService } from './schema';

program.Command.prototype.unknownOption = function (flag: any) {
    console.error(chalk.default.redBright(`Unknown arguments: ${flag}`));
    program.help();
};

interface ConnectLuisArgs extends ILuisService {
    bot: string;
    secret: string;
    stdin: boolean;
    input?: string;
}

program
    .name("msbot connect luis")
    .description('Connect the bot to a LUIS application')
    .option('-b, --bot <path>', "path to bot file.  If omitted, local folder will look for a .bot file")
    .option('--secret <secret>', 'bot file secret password for encrypting service secrets')
    .option('-n, --name <name>', 'name for the LUIS app')
    .option('-a, --appId <appid>', 'AppId for the LUIS App')
    .option('-v, --version <version>', 'version for the LUIS App, (example: v0.1)')
    .option('--authoringKey <authoringkey>', 'authoring key for using manipulating LUIS apps via the authoring API (See http://aka.ms/luiskeys for help)')
    .option('--stdin', "(OPTIONAL) arguments are passed in as JSON object via stdin")
    .option('--subscriptionKey <subscriptionKey>', '(OPTIONAL) subscription key used for querying a LUIS model')
    .option('--input <jsonfile>', "(OPTIONAL) arguments passed in as path to arguments in JSON format")
    .action((cmd, actions) => {

    });

let args = <ConnectLuisArgs><any>program.parse(process.argv);

if (process.argv.length < 3) {
    program.help();
} else {
    if (!args.bot) {
        BotConfig.LoadBotFromFolder(process.cwd(), args.secret)
            .then(processConnectLuisArgs)
            .catch((reason) => {
                console.error(chalk.default.redBright(reason.toString().split("\n")[0]));
                program.help();
            });
    } else {
        BotConfig.Load(args.bot, args.secret)
            .then(processConnectLuisArgs)
            .catch((reason) => {
                console.error(chalk.default.redBright(reason.toString().split("\n")[0]));
                program.help();
            });
    }
}

async function processConnectLuisArgs(config: BotConfig): Promise<BotConfig> {
    args.name = args.hasOwnProperty('name') ? args.name : config.name;

    if (args.stdin) {
        Object.assign(args, JSON.parse(await getStdin()));
    }
    else if (args.input != null) {
        Object.assign(args, JSON.parse(fs.readFileSync(<string>args.input, 'utf8')));
    }

    if (!args.hasOwnProperty('name'))
        throw new Error("Bad or missing --name");

    if (!args.appId || !uuidValidate(args.appId))
        throw new Error("bad or missing --appId");

    if (!args.version || parseFloat(args.version) == 0)
        throw new Error("bad or missing --version");

    if (!args.authoringKey || !uuidValidate(args.authoringKey))
        throw new Error("bad or missing --authoringKey");

    //if (!args.subscriptionKey || !uuidValidate(args.subscriptionKey))
    //    throw new Error("bad or missing --subscriptionKey");

    // add the service
    config.connectService(<ILuisService>{
        type: ServiceType.Luis,
        name: args.name,
        id: args.appId,
        appId: args.appId,
        version: args.version,
        subscriptionKey: args.subscriptionKey,
        authoringKey: args.authoringKey
    });
    await config.Save();
    return config;
}
