import { createClient, createConfig } from '@hey-api/client-fetch';
import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString, time } from 'discord.js';
import { createRequire } from 'node:module';

import { InfoOption } from '../../enums/index.js';
import { Language } from '../../models/enum-helpers/index.js';
import { EventData } from '../../models/internal-models.js';
import type {
    GetDiscoverMoviesError,
    GetDiscoverMoviesData,
    MovieResult,
    TvResult,
} from '../../overseer-client/types.gen.js';
import { getSearch, getMovieByMovieId, getTvByTvId } from '../../overseer-client/services.gen.js';
import { Lang } from '../../services/index.js';
import { InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';

const require = createRequire(import.meta.url);
let Config = require('../../../config/config.json');

const plexStatus = {
    1: 'Unknown or Not Available',
    2: 'Requested to be Fulfilled',
    3: 'Waiting to be Fulfilled',
    4: 'Partially Available',
    5: 'Available'
}

const client = createClient(createConfig({
    baseUrl: Config.overseer.baseUrl,
    headers: {
        'X-Api-Key': Config.overseer.apiKey
    },
}));


export class ShowCommand implements Command {
    public names = ['show'];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {

        //const searchRes =

        const title = intr.options.getString('title');

        const results = await getSearch({
            client,
            query: {
                query: title
            }
        });

        if(results.error !== undefined) {
            await InteractionUtils.send(intr, Lang.getEmbed('errorEmbeds.caughtError', data.lang, {
                message: `Overseer API failed while searching for Shows: ${(results.error as Error).message}`
            }));
        }

        // TODO allow user to choose movie?
        const shows = results.data.results.filter(x => x.mediaType === 'tv') as TvResult[];
        if(shows.length === 0) {
            await InteractionUtils.send(intr, Lang.getEmbed('errorEmbeds.caughtError', data.lang, {
                message: `Could not find any Shows with matched title '${title}'`
            }));
        }

        const show = await getTvByTvId({
            client,
            path: {
                tvId: shows[0].id
            }
        });

        if(show.error !== undefined) {
            await InteractionUtils.send(intr, Lang.getEmbed('errorEmbeds.caughtError', data.lang, {
                message: `Overseer API failed while fetching Show details: ${(show.error as Error).message}`
            }));
        }

        let embed: EmbedBuilder = new EmbedBuilder();

        embed.setTitle(show.data.name);
        if(show.data.externalIds?.imdbId !== null) {
            embed.setURL(`https://www.imdb.com/title/${show.data.externalIds?.imdbId}/`);
        }
        embed.setDescription(show.data.overview);
        if(show.data.posterPath !== undefined) {
            embed.setImage(`https://image.tmdb.org/t/p/w600_and_h900_bestv2/${show.data.posterPath}`);
        }

        embed.addFields([
            {
                name: 'Release Details',
                value: `
                * **${show.data.status}**
                * First Air Date: ${show.data.firstAirDate !== null && show.data.firstAirDate !== undefined ? time(new Date(show.data.firstAirDate)) : 'Unknown'}`
            },
            {
                name: 'Is it on Plex Yet?',
                value: plexStatus[show.data.mediaInfo?.status ?? 1]
            }
        ]);


        await InteractionUtils.send(intr, embed);
    }
}
