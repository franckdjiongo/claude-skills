# Text Refiner: exemples

## 1. Dictée française avec hésitations

Entrée:
```
Euh alors je voulais dire que... bon le projet il avance bien mais euh on a eu des des problèmes avec la base de données hier et puis voilà quoi on doit refaire les tests
```
Sortie:
```
Le projet avance bien, mais nous avons eu des problèmes avec la base de données hier. Nous devons refaire les tests.
```

## 2. Erreurs de transcription en anglais

Entrée:
```
We need to, you know, like finalize the report by friday and then umm send it to the client. Its really important that we dont miss the deadline this time.
```
Sortie:
```
We need to finalize the report by Friday and then send it to the client. It's really important that we don't miss the deadline this time.
```

## 3. Langue imposée (FR sur entrée anglaise)

Entrée: `FR: The meeting is scheduled for tomorrow at 3pm and we need to prepare the slides`
Sortie: `La réunion est prévue pour demain à 15h et nous devons préparer les diapositives.`

## 4. Courriel dicté

Entrée:
```
Bonjour euh je vous écris pour euh confirmer notre rendez-vous de de lundi prochain à à 14h. Euh si jamais vous avez besoin de reporter merci de me le dire au plus vite quoi. Cordialement
```
Sortie:
```
Bonjour,

Je vous écris pour confirmer notre rendez-vous de lundi prochain à 14h. Si vous avez besoin de le reporter, merci de me le dire au plus vite.

Cordialement
```

## 5. Contenu technique préservé

Entrée:
```
Alors pour le le déploiement on va utiliser euh Docker et Kubernetes donc euh il faut configurer les pods et puis euh mettre en place le load balancer quoi
```
Sortie:
```
Pour le déploiement, nous utiliserons Docker et Kubernetes. Il faut configurer les pods et mettre en place le load balancer.
```
