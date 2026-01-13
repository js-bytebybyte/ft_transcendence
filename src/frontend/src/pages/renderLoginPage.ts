import { userApi } from "../API/api.js";
import { router } from "../router.js";
import { authService } from "../API/auth.js";
import { renderNavBar } from "./renderNavBar.js";
import { connectWebSocket } from "../API/mysocket.js";
import { setNavbarStatus, setNavbarError } from "../utils.js";
import { handle2FA } from "./renderTwoFaBox.js";

const googleAuthLink =  (process.env.NODE_ENV === "production" 
  ? "https://" : "http://")
    + window.location.hostname + ":3000/api/login/google";

export async function renderLoginPage(mainElement : HTMLElement){
    const logged = await authService.isValid();
    if (logged){
        router.navigate('/home');
        return;
    }
    const status = document.getElementById("status");
    if (status)
        status.innerText = `LOG INTO YOUR ACCOUNT`;
    mainElement.innerHTML = `
    <div class="signup-container">
        <h1 class="registerH1">Login</h1>
        <form id="login-form" class="registerForm">
            <div class="relative">
                <div class="registerFormInputDiv">
                    <svg class="registerFormSvg" fill="currentColor" viewBox="0 0 21 21">
                        <path stroke-width="1" d="M7.5 11.875c-.292 0-.538-.1-.74-.302a1.006 1.006 0 0 1-.302-.74c0-.291.1-.538.302-.74.202-.2.448-.301.74-.301s.538.1.74.302c.2.201.301.448.301.74 0 .291-.1.537-.302.739a1.006 1.006 0 0 1-.74.302Zm5 0c-.292 0-.538-.1-.74-.302a1.006 1.006 0 0 1-.302-.74c0-.291.1-.538.302-.74.202-.2.448-.301.74-.301.291 0 .538.1.74.302.2.201.301.448.301.74 0 .291-.1.537-.302.739a1.006 1.006 0 0 1-.74.302ZM10 16.667c1.86 0 3.437-.646 4.729-1.938 1.292-1.291 1.938-2.868 1.938-4.729 0-.333-.021-.656-.063-.969a4.032 4.032 0 0 0-.23-.906 7.705 7.705 0 0 1-1.79.208A8.156 8.156 0 0 1 11 7.521 8.32 8.32 0 0 1 8.125 5.25a8.216 8.216 0 0 1-1.906 2.823 8.14 8.14 0 0 1-2.886 1.802V10c0 1.861.646 3.438 1.938 4.73 1.291 1.29 2.868 1.937 4.729 1.937Zm0 1.666a8.115 8.115 0 0 1-3.25-.656 8.416 8.416 0 0 1-2.646-1.781 8.415 8.415 0 0 1-1.781-2.646A8.115 8.115 0 0 1 1.667 10c0-1.153.218-2.236.656-3.25a8.415 8.415 0 0 1 1.781-2.646A8.415 8.415 0 0 1 6.75 2.323 8.115 8.115 0 0 1 10 1.667c1.153 0 2.236.218 3.25.656a8.416 8.416 0 0 1 2.646 1.781 8.415 8.415 0 0 1 1.78 2.646 8.115 8.115 0 0 1 .657 3.25 8.115 8.115 0 0 1-.656 3.25 8.415 8.415 0 0 1-1.781 2.646 8.416 8.416 0 0 1-2.646 1.781 8.114 8.114 0 0 1-3.25.656ZM8.875 3.437a6.68 6.68 0 0 0 2.375 2.344c1 .59 2.11.886 3.333.886.195 0 .382-.01.563-.032.18-.02.368-.045.562-.073a6.68 6.68 0 0 0-2.375-2.343c-1-.59-2.11-.886-3.333-.886-.195 0-.382.01-.563.032-.18.02-.368.045-.562.072ZM3.687 7.896a6.656 6.656 0 0 0 1.855-1.563 6.633 6.633 0 0 0 1.187-2.146A6.656 6.656 0 0 0 4.875 5.75a6.634 6.634 0 0 0-1.188 2.146Z"></path>
                    </svg>
                </div>
                <input class="registerFormInput" placeholder="Username" type="username" id="username" name="username" required>
            </div>
            <div class="relative">
                <div class="registerFormInputDiv">
                    <svg class="registerFormSvg" fill="currentColor" viewBox="0 0 22 22">
                        <path d="M6.417 16.5c-1.528 0-2.827-.535-3.896-1.604C1.45 13.826.917 12.528.917 11S1.45 8.174 2.52 7.104C3.59 6.034 4.889 5.5 6.417 5.5c1.008 0 1.932.252 2.772.756a5.664 5.664 0 0 1 1.994 1.994h9.9v5.5H19.25v2.75h-5.5v-2.75h-2.567a5.665 5.665 0 0 1-1.994 1.994 5.29 5.29 0 0 1-2.772.756Zm0-1.833c1.008 0 1.818-.31 2.429-.928.61-.62.977-1.227 1.1-1.822h5.637v2.75h1.833v-2.75h1.834v-1.834H9.946c-.123-.595-.49-1.203-1.1-1.822-.611-.618-1.421-.928-2.43-.928-1.008 0-1.871.36-2.59 1.077C3.11 9.128 2.75 9.992 2.75 11c0 1.008.359 1.871 1.077 2.59.718.718 1.581 1.077 2.59 1.077Zm0-1.834c.504 0 .935-.18 1.294-.538.36-.36.539-.79.539-1.295 0-.504-.18-.936-.539-1.295a1.765 1.765 0 0 0-1.295-.538c-.504 0-.935.18-1.294.538-.36.36-.539.79-.539 1.295 0 .504.18.936.539 1.295.359.359.79.538 1.295.538Z"></path>
                    </svg>
                </div>
                <input class="registerFormInput" placeholder="password" type="password" id="password" name="password" autocomplete="new-password" required>
            </div>
            <div class="pt-4 flex justify-end">
                <button type="submit" class="arrow-button" id="login-button">
                    <svg class="arrow-buttonSvg" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M18.8707 15.1667H4.6665V12.8333H18.8707L12.3373 6.3L13.9998 4.66667L23.3332 14L13.9998 23.3333L12.3373 21.7L18.8707 15.1667Z" fill="currentColor"/>
                    </svg>
                </button>
                <button type="button" class="arrow-button">
                    <a href="${googleAuthLink}" class="google-login-btn">
                        <svg class="arrow-buttonSvg" viewBox="0 0 29 30" fill="currentColor">
                            <path d="M15.0051 12.457V17.9736H22.8647C21.8394 21.3164 19.0452 23.7107 15.0051 23.7107C10.196 23.7107 6.29444 19.8091 6.29444 15C6.29444 10.1909 10.1909 6.28931 15.0051 6.28931C17.1687 6.28931 19.1426 7.08398 20.6653 8.39136L24.7258 4.32568C22.1624 1.98779 18.7478 0.5625 15.0051 0.5625C7.02759 0.5625 0.5625 7.02759 0.5625 15C0.5625 22.9724 7.02759 29.4375 15.0051 29.4375C27.1252 29.4375 29.8015 18.1018 28.6121 12.4775L15.0051 12.457Z"></path>
                        </svg>
                    </a>
                </button>
            </div>
         </form>
    </div>
    `;


    function delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    const statusDiv = document.getElementById("login-status") as HTMLDivElement;
    const button = document.getElementById("login-button") as HTMLButtonElement;
    const form = document.getElementById("login-form");
    if(form){
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const username = (event.target as HTMLFormElement).username.value;
            const password = (event.target as HTMLFormElement).password.value;
            //console.log(username, password);
            try{
                button.disabled = true;
                
                const LoginResponse = await userApi.usernameLogin({username, password});
                //console.log(LoginResponse);
                const User = LoginResponse.User
                const Token = LoginResponse.AccessToken;
                if(User.two_fa_is_active === 1){
                    await handle2FA(mainElement, User.id);
                }
                else{
                    //console.log(Token);
                    authService.setAccessToken(Token);
                    await connectWebSocket();
                    await renderNavBar();
                    router.navigate('/home');
                };
            }
            catch (err : any){
                setNavbarError(`${err}`);
                await delay(150);
            }
            finally{
                button.disabled = false;
            }
        });
    }
}