# The city: research

What the [art bible](bible.md) is built on. Gathered on 4 Oct 2026, when Martin asked for the city to be planned from the ground up and asked whether Claude Design was needed.

## Restraint: spend colour only where it means something

- **Mirror's Edge** is a nearly white city in which red marks what you can climb or use ("runner vision"); warm colours on a cool, plain background stand out at once. The usual lesson drawn from it: split colours unevenly, 70/30 to 90/10, never in equal shares. ([World of Level Design](https://www.worldofleveldesign.com/categories/game_environments_design/mirrors-edge-color.php), [Superjump](https://www.superjumpmagazine.com/seeing-red-movement-as-an-art-form))
  - *Taken:* a quiet base for 80–90% of the screen; one signal kept for "you can use this". In a neon city every hue already has a job, so our signal is brightness, not a hue.

## One colour per place

- **Blade Runner 2049** gives each location its own colour; its Las Vegas is bathed in orange. ([StudioBinder](https://www.studiobinder.com/blog/blade-runner-2049-cinematography))
- **Cyberpunk 2077** built Night City from four styles tied to wealth: a poor style (old concrete, weathered plastic), a flashy one (bright rounded plastic, neon), a corporate one (sleek metal, dark glass, minimal) and an ultra-rich one (gold, leather). ([VGC](https://videogameschronicle.com/news/new-cyberpunk-2077-trailers-showcase-the-games-vehicles-and-night-citys-four-visual-styles))
- **Cloudpunk**, a voxel cyberpunk city, is built on many levels with a sharp divide between the rich and the poor. ([Press Start](https://press-start.com.au/reviews/pc-reviews/2020/05/07/cloudpunk-review-an-unforgettable-night/))
  - *Taken:* four districts, each with one neon colour, its own materials and its own shapes; wealth as the thing that sets them apart.

## Wealth rises with height

- **Hong Kong:** the Mid-Levels are home to well-paid people who have not yet reached "the pinnacle of social prestige: a residence on the peak itself". ([Christian Science Monitor](https://www.csmonitor.com/1996/1106/110696.feat.odyssey.1.html))
- **Ghost in the Shell** (1995) modelled its city on Hong Kong's streets, and its location photos were taken in black and white "because they should only show the build architecture"; the art director worked out the colours separately. ([032c](https://magazine.032c.com/magazine/anime-architecture-ghost-shell-built))
  - *Taken:* a harbour city on a hill, the Docks at the bottom and the Spires at the top (Martin's "elevation, megabuildings"); and the rule that references give us shapes, never colours.

## Decide what must be read first

- **Team Fortress 2:** Valve set a "read hierarchy" (team, then class, then weapon) and gave each its own signal: the team by colour, the class by silhouette (the best cue from far away), the weapon by contrast. ([Valve, GDC 2008](https://cdn.fastly.steamstatic.com/apps/valve/2008/GDC2008_StylizationWithAPurpose_TF2.pdf))
  - *Taken:* the city's read hierarchy (where can I walk, what can I use, who is that, where am I, when is it), each with its own signal; people told apart by silhouette first.

## A small fixed palette makes things belong together

- **Caves of Qud:** 18 fixed colours, and each 16×24 tile may use only three of them. ([wiki](https://wiki.cavesofqud.com/wiki/Visual_Style))
- **Our own phase 1:** v1 showed about 4,000 colours on screen and read as mush; the Land's hand-built ramps show about 70–80, and that is why it reads ([direction.md](../direction.md), [research.md](../research.md)).
  - *Taken:* the city's palette has the Land's form (ramps per hour, dark to light, hue-shifted), and the same budget of about 80 colours on screen.

## Design systems: raw colours apart from what they mean

- **Design tokens:** the W3C community group's format reached its first stable version in October 2025, with theming and multi-brand support: a design keeps its parts and swaps the values underneath. ([W3C](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/))
  - *Taken:* the screens keep the Land's layout and behaviour, and only their skin (the CSS variables) changes per world. In the game, colours are named by their job (base, district light, signal), not by their value.

## Colour-blind safety

- About **1 man in 12 and 1 woman in 200** are colour blind, mostly red-green. ([GOV.UK design blog](https://design102.blog.gov.uk/2019/09/06/today-is-colour-blind-awareness-day-how-aware-are-you/))
- **Simulation:** Machado, Oliveira and Fernandes, "A physiologically-based model for simulation of color vision deficiency" (IEEE TVCG, 2009), matrices at severity 1, applied in linear RGB. ([the authors' page](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html))
- **Distances** are measured in OKLab, a colour space in which equal steps look about equally different. ([Björn Ottosson](https://bottosson.github.io/posts/oklab/))
  - *Taken:* the checks in `tools/city-sheet.mjs`; neon glows stepped in lightness as well as hue; shapes, never colour alone, tell the districts apart.

## Why not Claude Design for the world

- **Claude Design** (Anthropic Labs, April 2026) makes designs, prototypes, decks and one-pagers on a canvas, builds a design system from a codebase, and hands work to Claude Code. Its help centre lists what it does best: landing pages, decks, UI prototypes, data visualisations, email templates, component demos. ([Anthropic](https://www.anthropic.com/news/claude-design-anthropic-labs), [help centre](https://support.claude.com/en/articles/14604416))
  - *Decided:* not for the city itself. The city is drawn by our own renderer, which Claude Design cannot run, so its pictures of the city would be guesses; and a second palette there would drift from the game's. It could help later with the start screen, the screens' skin, or a poster or landing page for the game.
