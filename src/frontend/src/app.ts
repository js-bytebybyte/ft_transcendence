import { renderHomePage } from './pages/renderHomePage.js'
import { renderNotFound } from './pages/renderNotFound.js';
import { renderRegisterPage } from './pages/renderRegisterPage.js';
import { renderLoginPage } from './pages/renderLoginPage.js';
import { renderGamePage } from './pages/renderGamePage.js';
import { renderTournamentPage } from './pages/renderTournamentPage.js';
import { renderProfilPage } from './pages/renderProfilPage.js';
import { renderChatBox } from './pages/renderChatBox.js';
import { renderFriendList } from './pages/renderFriendList.js';
import { renderSettings } from './pages/renderSettings.js';
import {handle2FA}  from './pages/renderTwoFaBox.js';

interface App {
    navigate : (path : string) => void;
    render : (component: string) => void;
}

export function createApp(): App {
    
    const app : App = {
        navigate : (path : string) => {
            //method used by router
            //console.log("navigate method initialized")
        },
        render : (component : string, param? : string | null) => {
            const mainElement = document.getElementById("app-container");
            if (!mainElement) {
                throw new Error("App container not found");
            }
            //console.log(`router composant recus :${component}`);
            //console.log(component);
            //console.log(param);
            switch(component){
                case "home":
                    //mainElement.innerHTML = "<h1>HOME</h1>";
                    renderHomePage(mainElement);
                    break;
                case "twofa":
                    handle2FA(mainElement, parseInt(param!));
                    break;
                case "register":
                    renderRegisterPage(mainElement);
                    break;
                case "login":
                    renderLoginPage(mainElement);
                    break;
                case "game":
                    renderGamePage(mainElement);
                    break;
                case "tournament":
                    renderTournamentPage(mainElement);
                    break;
                case "profil":
                    renderProfilPage(mainElement, param);
                    break;
                case "chat":
                    renderChatBox(mainElement);
                    break;
                case "friendlist":
                    renderFriendList(mainElement);
                    break;
                case "settings":
                    renderSettings(mainElement);
                    break;
                default:
                    renderNotFound(mainElement);
                    break;
            }
        }
    }
    
    return app;
}
