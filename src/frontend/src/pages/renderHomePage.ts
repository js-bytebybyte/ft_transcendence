
import { authService }  from "../API/auth.js";
import { userApi }      from "../API/api.js";

import { setNavbarStatus, setNavbarError } from "../utils.js";

export async function renderHomePage(mainElement: HTMLElement) {
  mainElement.innerHTML = `
    <div class="relative flex items-center justify-center">
      <p class="text-justify font-mono font-thin text-4xl">
        A MODERN APP USING TYPESCRIPT, DOCKER, FASTIFY, AND TAILWINDCSS, TRANSCENDENCE IS A FULL-STACK WEB APPLICATION DESIGNED TO EMULATE A MULTIPLAYER ONLINE GAME PLATFORM. IT INVOLVES REAL-TIME COMMUNICATION VIA WEBSOCKETS, USER AUTHENTICATION AND PERSISTENCE, DATABASE DESIGN FOR PERSISTENT STATE, AND CONTAINERIZED DEPLOYMENT. THE PROJECT REQUIRES INTEGRATION OF FRONTEND AND BACKEND SYSTEMS, ROBUST USER INTERFACE IMPLEMENTATION, AND HANDLING OF GAME LOGIC WITH LATENCY-SENSITIVE INTERACTIONS. ITS PURPOSE IS TO DEMONSTRATE MASTERY OF SCALABLE ARCHITECTURE, SERVICE ORCHESTRATION, AND SECURE, PERFORMANT APPLICATION DEVELOPMENT.
      </p>
      <p class="absolute left-9 top-1/2 -translate-y-1/2 font-jacquard text-shadow text-[14rem]">
        TRANSCENDENCE
      </p>
    </div>
  `;
  
  const userId = await authService.getUserId();
  if (userId) {
    const userResponse = await userApi.getUserById(userId);
    setNavbarStatus(`WELCOME ${userResponse.user.username} — WHAT DO YOU WANT TO DO TODAY ?`);
  } else {
    setNavbarStatus("WELCOME TO TRANSCENDENCE — PLEASE LOGIN TO PLAY");
  }
}
