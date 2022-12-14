import {TelegramNotifications} from '../../app';
import {Markup} from "telegraf";
import Question from "../../question";

export default class HandleQuestions {
    constructor(app: TelegramNotifications) {
        if (app.bot == null) return;

        //Once the Setting Question is set by the app settings in will reload it to the memory
        app.homey.settings.on('set', (key) => {
            if (key == 'questions')
                app.loadQuestions()
        })

        //Getting Trigger Flows
        const receiveQuestionAnswerTrigger = app.homey.flow.getTriggerCard('receive-question-answer');
        const receiveQuestionAnswerWithAnswerTrigger = app.homey.flow.getTriggerCard('receive-question-answer-with-answer');
        const receiveQuestionAnswerAutocomplete = app.homey.flow.getTriggerCard('receive-question-answer-autocomplete');


        //region Autocomplete
        receiveQuestionAnswerTrigger.registerArgumentAutocompleteListener(
            'question',
            async (query) => {
                const results: any = [];
                app.questions.forEach((question) => {
                    results.push({
                        name: question.question,
                        id: question.UUID,
                    });
                });
                return results.filter((result: any) => {
                    return result.name.toLowerCase().includes(query.toLowerCase());
                });
            },
        );
        receiveQuestionAnswerWithAnswerTrigger.registerArgumentAutocompleteListener(
            'question',
            async (query) => {
                const results: any = [];
                app.questions.forEach((question) => {
                    results.push({
                        name: question.question,
                        id: question.UUID,
                    });
                });
                return results.filter((result: any) => {
                    return result.name.toLowerCase().includes(query.toLowerCase());
                });
            },
        );

        receiveQuestionAnswerAutocomplete.registerArgumentAutocompleteListener(
            'question',
            async (query) => {
                const results: any = [];
                app.questions.forEach((question) => {
                    results.push({
                        name: question.question,
                        id: question.UUID,
                    });
                });
                return results.filter((result: any) => {
                    return result.name.toLowerCase().includes(query.toLowerCase());
                });
            },
        );

        receiveQuestionAnswerAutocomplete.registerArgumentAutocompleteListener(
            'answer',
            async (query, args) => {
                let question = app.questions.find(question => question.UUID === args.question.id);
                if(!question) return [];
                let results: any = [];
                question.buttons.forEach((answer) => {
                    results.push({
                        name: answer,
                        id: question?.buttons.indexOf(answer)
                    })
                });
                return results.filter((result: any) => {
                    return result.name.toLowerCase().includes(query.toLowerCase());
                });
            },
        );
        //endregion

        //region State checking
        receiveQuestionAnswerTrigger.registerRunListener(async (args, state) => {
            return args.question.id === state.uuid;
        });

        receiveQuestionAnswerWithAnswerTrigger.registerRunListener(async (args, state) => {
            return args.question.id === state.uuid && args.answer == state.answer;
        });

        receiveQuestionAnswerAutocomplete.registerRunListener(async (args, state) => {
            return args.question.id === state.uuid && args.answer.name == state.answer;
        });
        //endregion

        //This event will trigger once an inline button is pressed
        app.bot.on('callback_query', async (ctx) => {
            if (ctx.callbackQuery.data == 'ignore-me') return;
            if (ctx.callbackQuery.data == 'user-add') return;
            let parts =  ctx.callbackQuery.data.split('.');
            let questionId = parts[0]
            let answerId = parts[1]
            let customId = undefined;
            if(parts.length == 3)
                customId = parts[2]
            let question = app.getQuestion(questionId);
            if (question === undefined) {
                app.error('Question not found. Did the question got deleted?"');
                await ctx.reply("ERROR: Question not found. Did the question got deleted?");
                throw new Error('Question with UUID ' + questionId + ' not found');
            }
            if(!question.keepButtons){
                await ctx.editMessageReplyMarkup({inline_keyboard: [[Markup.callbackButton(question.buttons[answerId], "ignore-me")]]}).catch();
            }
            // https://apps.developer.homey.app/the-basics/flow/arguments#flow-state
            //Building Token
            let token = {
                question: question.question,
                answer: Question.getAnswer(question, answerId),
                from: ctx.callbackQuery.from.first_name !== undefined ? ctx.callbackQuery.from.first_name : 'undefined',
                username: ctx.callbackQuery.from.username !== undefined ? ctx.callbackQuery.from.username : 'undefined',
                chat: ctx.chat.type === 'private' ? ctx.chat.first_name : ctx.chat.title,
                chatType: ctx.chat.type,
            };

            //Trigger Card with given state
            let state =  { uuid: question.UUID, answer: Question.getAnswer(question, answerId)};
            await receiveQuestionAnswerTrigger.trigger(token, state).catch(app.error);
            await receiveQuestionAnswerWithAnswerTrigger.trigger(token, state).catch(app.error);
            await receiveQuestionAnswerAutocomplete.trigger(token, state).catch(app.error);
            await ctx.answerCbQuery();
        });
    }
}
