1. Install docker desktop
   1a. Link: https://www.docker.com/products/docker-desktop/
2. Get the env.local file with data and copy it to env.example
   2a. Change directory to code location
   2b. create .env.local in the code location
   2c. run command: cp .env.example .env.local
3. Docker-compose up --build
   a.	docker-compose up -d --build
   ^ this runs it in the background (optional)
4. docker-compose down
   a.	this stops the container
