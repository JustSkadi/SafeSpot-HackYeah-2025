# HackYeah 2025 - SafeSpot

## About project

### Overview
Safe Spot is a web-based platform designed to enhance the safety and confidence of travelers. By providing a clear, visual representation of local incidents such as crimes and traffic accidents, the application serves as a crucial tool for conscious and safe travel planning. It helps tourists understand the safety landscape of their destination before and during their trip.

### Key Features:

- Travel-Focused Interactive Map: A dynamic map allows users to explore their destination, check specific neighborhoods, and plan their itineraries.
- Color-Coded Safety Zones: The map uses a heatmap to highlight areas with higher concentrations of reported incidents, helping travelers identify places where extra caution may be needed.
- Precise Incident Markers: Individual events are pinpointed on the map. Clicking on a marker reveals details about the incident.
- List View & Data Transparency: Alongside the map, a comprehensive list of incidents is available. Crucially, every event entry includes a summary and a direct link to a verifiable source, ensuring data reliability.

### Objective
The primary goal is to empower tourists with reliable, up-to-date safety information, allowing them to plan safer holidays, choose accommodations wisely, and navigate new cities with greater awareness and peace of mind.

## How to Run the Application

This project uses Docker to simplify setup and ensure a consistent environment. The following one-step command will clone the repository, run a setup script, and launch the application.

### Prerequisites

*   **Git:** You must have Git installed.
*   **Windows:** This script is designed for Windows and uses PowerShell.
*   **Administrator Privileges:** The script will attempt to install Docker Desktop, which requires administrator rights. You will see a UAC (User Account Control) prompt.

### One-Step Launch

Open a terminal (like Windows Terminal or Git Bash) and run the single command below. It will:
1.  Clone the repository to your Desktop.
2.  Navigate into the project directory.
3.  Execute the `run.ps1` PowerShell script to automate the entire setup.

**Copy and paste this command into your terminal:**

```bash
git clone https://github.com/tiruriru "$HOME/Desktop/your-repo-name" && cd "$HOME/Desktop/your-repo-name" && pwsh -ExecutionPolicy Bypass -File ./run.ps1
