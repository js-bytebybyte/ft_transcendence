import './styles/output.css';

import { createApp } from './app.js';
import { router } from './router.js'
import { renderNavBar } from './pages/renderNavBar.js';
import { messagingService } from './API/mysocket.js';
import { userApi } from './API/api.js';
import { authService } from './API/auth.js';


async function init_app() {
    //console.log("Frontend App initialize frontend");
    //console.log(`window location = ${window.location.pathname}`);
    const app = createApp()
    await renderNavBar();
    const appElement = document.getElementById("app");
    if (!appElement) {
      throw new Error("App container not found");
    }
    appElement.innerHTML =  `<div id="app-container" class="app-container">
    <!-- Le contenu sera injecté ici par le routeur -->
    </div>`;
    
    const appContainer = document.getElementById('app-container');
    if (!appContainer) {
      console.error("L'élément #app-container n'a pas été trouvé dans le DOM après insertion");
      return;
    }
    router.init(app);
    
    if(window.location.pathname.startsWith('/twofa')){
      router.navigate(window.location.pathname);
      return;
    }
    const socket = await messagingService.getWebSocket();
    if(!socket){
      await renderNavBar();
      //maybe something to look here
      //userApi.logout();
      router.navigate('/login');
    }
    const userId = await authService.getUserId();
    if(userId){
      //console.log("USER IS UPDATING ONLINE STATUS")
      const response = await userApi.VerifyUserOnlineStatus(userId);
      //console.log(response);
    }
}

document.addEventListener('DOMContentLoaded', init_app);