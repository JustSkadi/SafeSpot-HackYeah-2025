# HackYeah 2025 Travel - SafeSpot

## About project

### Overview
Safe Spot is a web-based platform designed to enhance the safety and confidence of travelers. By providing a clear, visual representation of local incidents such as crimes and traffic accidents, the application serves as a crucial tool for conscious and safe travel planning. It helps tourists understand the safety landscape of their destination before and during their trip.

### Key Features:

- **Travel-Focused Interactive Map:** A dynamic map allows users to explore their destination, check specific neighborhoods, and plan their itineraries.
- **Color-Coded Safety Zones:** The map uses a heatmap to highlight areas with higher concentrations of reported incidents, helping travelers identify places where extra caution may be needed.
- **Precise Incident Markers:** Individual events are pinpointed on the map. Clicking on a marker reveals details about the incident.
- **List View & Data Transparency:** Alongside the map, a comprehensive list of incidents is available. Crucially, every event entry includes a summary and a direct link to a verifiable source, ensuring data reliability.
- **Culture Zone:** A special feature that shows traditions, culturar diferences and tips for travelers from outside said region

### Objective
The primary goal is to empower tourists with reliable, up-to-date safety information, allowing them to plan safer holidays, choose accommodations wisely, and navigate new cities with greater awareness and peace of mind.

## How to Run the Application

### Prerequisites
*   **Git:** You must have Git installed.
```shell
winget install --id Git.Git -e --source winget
```
*   **Docker Desktop:** You must install Docker Desktop.
```shell
winget install -e --id Docker.DockerDesktop
```
*   **Windows:** This script is designed for Windows 10/11 that uses PowerShell.
*   **Administrator Privileges:** The script will attempt to install Docker Desktop, which requires administrator rights. You will see a UAC (User Account Control) prompt.

### Launch Instruction
1. After installing **Docker Desktop** restart your computer and open **Docker Desktop** app
2. Open your **Terminal** or **Powershell** as an Administrator
3. Copy and paste below command:
```shell
git clone -b main https://github.com/JustSkadi/SafeSpot-HackYeah-2025.git C:\SafeSpot
cd C:\SafeSpot
```
4. Copy and paste the below command to compose **Docker Containers** and install **n8n in Docker**:
```shell
docker-compose up -d
```
5. After dowloading, open **4 tabs** in your browser:
* **localhost:5678** -> Tab for the first AI Agent in n8n
* **localhost:5678** -> Tab for the second AI Agent in n8n
* **localhost:5678** -> Tab for the third AI Agent in n8n
* **localhost:8080** -> local port for hosting our app ( we weren't able to host it any other way without paying a lot and still being able to use n8n platform )
6. **When opening n8n for the first time YOU MAY NEED to log in and then authorize your email address**
7. After successfully loging in and opening all 3 n8n tabs, in each tab open a different bot:
* Criminal.json
* Road accident.json
* CultureBot.json

You open the bot by clicking on a "+" button,
then "Workflow",
<img width="223" height="206" alt="image" src="https://github.com/user-attachments/assets/9842f292-5136-4035-b0da-a08690735e80" />

"***" three dots,
"Import from file..." 
<img width="262" height="357" alt="image" src="https://github.com/user-attachments/assets/8ae4265c-734e-4d7c-b3ae-daf34adc5da1" />

and choose a json file for each BOT listed above.
Each of them should have a green button with **"Active"** message next to them, if not please activate them.

8. Next we need to set up LLM AI Credentials in all 5 Nodes looking like this:
<img width="147" height="151" alt="image" src="https://github.com/user-attachments/assets/e2611872-8714-401e-ab01-2d1853022731" />

You set it up by **double-clicking on the Node (pic)** and then clicking on the:
<img width="390" height="127" alt="image" src="https://github.com/user-attachments/assets/318fd837-6df5-4f7e-bfad-062223e0a09b" />

Lastly, paste the **API KEY** I will provide to judges in our Project Description on Rocket Challenge.
We finish by clicking button:
<img width="76" height="58" alt="image" src="https://github.com/user-attachments/assets/14125078-9e35-4cd2-bdff-1cfa4be3c6f5" />

It's an instruction only for the **First Node**. After that, the Credentials will be saved for other Nodes.

9. Before using the **Application of the 4th Node**, for each bot click on:
<img width="201" height="64" alt="image" src="https://github.com/user-attachments/assets/610cb8f8-82f4-4313-ab49-fe80df4d30c5" />

**Right now, n8n is having problems with Production API for Webhooks! That's why we had to use Test API. After each and every Webhook you will have to click on this button again to start the bot! WE ARE SORRY FOR THE INCONVENIENCE** 
<img width="201" height="64" alt="image" src="https://github.com/user-attachments/assets/6de1d67e-9186-4f95-a4a0-39f7de6a38f6" />


*Our current App works only for Krakow because we didn't have time to set up a new Data Base what will work fine with n8n and the rest of the code! In the future we plan to add a lot of cities and regions! Right now it's a Beta Version but even after the Hackathon we plan to develop our app to reach its true potential and automation level.*


