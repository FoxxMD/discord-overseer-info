# Discord Overseer Info

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Pulls](https://img.shields.io/docker/pulls/foxxmd/discord-overseer-info)](https://hub.docker.com/r/foxxmd/discord-overseer-info)

A very simple discord bot to display information from your [Overseer](https://overseerr.dev/) instance:

* Search for movies using `/movie` and shows using `/shows`
* Displays:
  * Media description, link to imdb, 
  * **Release Dates** for theatrical, digital, and physical
  * The current status of the media in Overseer (Available in plex, requested, processing, etc...)

This is a **read-only** bot your users can use to get a "quick look" at whether some media is available on Plex and, if not, when it might be (based on release details!)

Built on [https://github.com/KevinNovak/Discord-Bot-TypeScript-Template](https://github.com/KevinNovak/Discord-Bot-TypeScript-Template)

| Movies                    | Shows                   |
|---------------------------|-------------------------|
| ![movie](/misc/movie.png) | ![show](/misc/show.png) |

This is a _very_ quick and dirty bot I cooked up in an hour for a personal server. Please don't judge the code too harshly :)

# Setup

### Create a Discord Bot

* Follow the usual directions to [create a new discord bot](https://www.writebots.com/discord-bot-token/)
  * Copy the API token (or reset it first to get a copy), save it for later use
* Invite or add the new bot to your server
  * Copy the ID of the bot user after it is in your server, save it for later use

### Create Bot Config

Create a new folder on your host machine named `discord-overseer-info` and copy into it:

* [`compose.yml`](/compose.yml)
* [`/config` folder](/config)

Rename all files in `/config` by removing `.example` (so `config.example.json` becomes `config.json` etc...)

In `config.json`:

* Update `developers` property with your own discord ID
* In `client.id` use the bot ID you saved earlier
* In `client.token` use the API token your saved earlier

### Start the bot

Run `docker-compose up -d` from the `discord-overseer-info` directory.

Enjoy.
