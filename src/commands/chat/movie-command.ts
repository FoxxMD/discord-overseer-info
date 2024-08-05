import { ChatInputCommandInteraction, EmbedBuilder, PermissionsString, time } from 'discord.js';
import { createRequire } from 'node:module';
import { InfoOption } from '../../enums/index.js';
import { Language } from '../../models/enum-helpers/index.js';
import { EventData } from '../../models/internal-models.js';
import { Lang } from '../../services/index.js';
import { FormatUtils, InteractionUtils } from '../../utils/index.js';
import { Command, CommandDeferType } from '../index.js';
import { createClient, createConfig, type Options } from '@hey-api/client-fetch';
import type { GetDiscoverMoviesError, GetDiscoverMoviesData, MovieResult } from '../../overseer-client/types.gen.js';
import { getDiscoverMovies, getSearch, getMovieByMovieId } from '../../overseer-client/services.gen.js';

const require = createRequire(import.meta.url);
let Config = require('../../../config/config.json');

const client = createClient(createConfig({
    baseUrl: Config.overseer.baseUrl,
    headers: {
        'X-Api-Key': Config.overseer.apiKey
    },
}));


interface ReleaseDate {
    certification?: string;
    iso_639_1?: string | null;
    note?: string | null;
    release_date?: string;
    // Release date types:
    // 1. Premiere
    // 2. Theatrical (limited)
    // 3. Theatrical
    // 4. Digital
    // 5. Physical
    // 6. TV
    type?: number;
}

const releaseType = {
    1: 'Premiere',
    2: 'Theatrical',
    3: 'Theatrical',
    4: 'Digital',
    5: 'Physical',
    6: 'TV'
}

const plexStatus = {
    1: 'Unknown or Not Available',
    2: 'Requested to be Fulfilled',
    3: 'Waiting to be Fulfilled',
    4: 'Partially Available',
    5: 'Available'
}

const sortStrDate = (a: string, b: string): number => {
    const aDate = new Date(a);
    const bDate = new Date(b);
    // @ts-ignore
    return aDate - bDate;
}

export class MovieCommand implements Command {
    public names = ['movie'];
    public deferType = CommandDeferType.PUBLIC;
    public requireClientPerms: PermissionsString[] = [];

    public async execute(intr: ChatInputCommandInteraction, data: EventData): Promise<void> {


        const movieTitle = intr.options.getString('title');

        const movieResults = await getSearch({
            client,
            query: {
              query: movieTitle
            }
        });

        if(movieResults.error !== undefined) {
            await InteractionUtils.send(intr, Lang.getEmbed('errorEmbeds.caughtError', data.lang, {
                message: `Overseer API failed while searching for movies: ${(movieResults.error as Error).message}`
            }));
        }

        // TODO allow user to choose movie?
        const movies = movieResults.data.results.filter(x => x.mediaType === 'movie') as MovieResult[];
        if(movies.length === 0) {
            await InteractionUtils.send(intr, Lang.getEmbed('errorEmbeds.caughtError', data.lang, {
                message: `Could not find any movies with matched title '${movieTitle}'`
            }));
        }

        const movie = await getMovieByMovieId({
            client,
            path: {
                movieId: movies[0].id
            }
        });

        if(movie.error !== undefined) {
            await InteractionUtils.send(intr, Lang.getEmbed('errorEmbeds.caughtError', data.lang, {
                message: `Overseer API failed while fetching movie details: ${(movie.error as Error).message}`
            }));
        }

        let embed: EmbedBuilder = new EmbedBuilder();

        embed.setTitle(movie.data.title);
        if(movie.data.externalIds?.imdbId !== null) {
            embed.setURL(`https://www.imdb.com/title/${movie.data.externalIds?.imdbId}/`);
        }
        embed.setDescription(movie.data.overview);
        if(movie.data.posterPath !== undefined) {
            embed.setImage(`https://image.tmdb.org/t/p/w600_and_h900_bestv2/${movie.data.posterPath}`);
        }

        const releaseDeets: [string, string][] = [];
        let releaseDates: ReleaseDate[] = [];
        const USRelease = movie.data.releases.results.find(x => x.iso_3166_1 === 'US');
        if(USRelease !== undefined) {
            releaseDates = USRelease.release_dates.map(x => ({...x, iso_639_1: 'US'}));
        }

        const allReleaseDates = movie.data.releases.results.map(x => x.release_dates.map(y => ({...y, iso_639_1: x.iso_3166_1 }))).flat(2);
        allReleaseDates.sort((a, b) => sortStrDate(a.release_date, b.release_date));

        const releaseTypes = [
            {
                name: 'Theatrical',
                types: [3,2,1]
            },
            {
                name: 'Digital',
                types: [4]
            },
            {
                name: 'Physical',
                types: [5]
            },
        ];

        for(const rTypes of releaseTypes) {
            let release = releaseDates.find(x => x.type === rTypes.types[0]);
            if (release === undefined && rTypes.types[1] !== undefined) {
                release = releaseDates.find(x => x.type === rTypes.types[1]);
            }
            if (release !== undefined) {
                releaseDeets.push([`${rTypes.name} (${release.iso_639_1})`, FormatUtils.releaseISOToDate(release.release_date)])
            } else {
                const allTypeReleases = allReleaseDates.filter(x => rTypes.types.includes(x.type));
                if (allTypeReleases.length > 0) {
                    releaseDeets.push([`${releaseType[rTypes.types[0]]} (${allTypeReleases[0].iso_639_1})`, FormatUtils.releaseISOToDate(allTypeReleases[0].release_date)])
                } else {
                    releaseDeets.push([releaseType[rTypes.types[0]], 'No Info']);
                }
            }
        }

        embed.addFields([
            {
                name: 'Release Details',
                value: `
                \n
                **${movie.data.status}**
                
                ${releaseDeets.map(x => `* ${x[0]} : ${x[1]}`).join('\n')} `
            },
            {
                name: 'Is it on Plex Yet?',
                value: plexStatus[movie.data.mediaInfo?.status ?? 1]
            }
        ]);


        await InteractionUtils.send(intr, embed);
    }
}
