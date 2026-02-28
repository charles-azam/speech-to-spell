Visuals/backend:

1. Tester de générer les emojis à l'écran avec un tool qui prend l'emoji et l'effet (et mettre une liste d'effets)
1. demander au LLM de générer un SVG et regarder comment ça prend
1. premade sprint bank et trouver comment les intégrer à l'interface + des gifs connue 
1. demander au LLM de générer du CSS qu'on render on the spot
1. programic particles
1. glitch the game "penser à tous les tools sur des changements profonds de la scène 
1. regarder le pixel art

Utiliser ministral pour ça et lui faire appeler des tools.

Utiliser le mistral python SDK 

Dans les bonus techniques:
- rag sur un dataset d'images / gifs (trouver le dataset)
- à partir de ce qui est déjà fait rajouter la pipeline qui évalue le ton


pour charles:
- rajouter le VAD
- rajouter les commentateurs, sûrement en STT
- rajouter les sounds effects 
- essayer de call directement voxtral tool calling to reduce latency

# New direction

Now we want for each wizzard to start with 10 different emojis randomly picked among a huge bank of all of the emojis. 

Then each sorcerer can use the mouse to hand pick at least two emojis. More is better. 

Then he needs to speak to create an attack spell "rain of dogs" for instance. 

He speaks to a judge. The judge can either say YES NO or leave you room for explaination "explain yourself".

These spells can either be for you or for the other. (increase your life or decrease the life of your friend).

Additional features:
- The judge make funny comments "même toi tu n'y crois pas"
- having commentator on top of the judge
- le ton est important

Then after we want the fastest path to deployment (maybe the players just make a room). 
