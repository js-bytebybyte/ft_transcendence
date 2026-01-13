// required: HTML instruction that prevent event to be trigger with empty field 
// HTML instruction apply a simple verification on Email format if we want more we should use JavaScript or regex pattern in html
import { router } from "../router.js";
import { userApi } from "../API/api.js";
import { authService } from "../API/auth.js";
import { renderNavBar } from "./renderNavBar.js";
import { messagingService } from "../API/mysocket.js";
import { escapeHtml } from "../utils.js";
import { setNavbarStatus, setNavbarError } from "../utils.js";
//path username figma icon : <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7.5 11.875c-.292 0-.538-.1-.74-.302a1.006 1.006 0 0 1-.302-.74c0-.291.1-.538.302-.74.202-.2.448-.301.74-.301s.538.1.74.302c.2.201.301.448.301.74 0 .291-.1.537-.302.739a1.006 1.006 0 0 1-.74.302Zm5 0c-.292 0-.538-.1-.74-.302a1.006 1.006 0 0 1-.302-.74c0-.291.1-.538.302-.74.202-.2.448-.301.74-.301.291 0 .538.1.74.302.2.201.301.448.301.74 0 .291-.1.537-.302.739a1.006 1.006 0 0 1-.74.302ZM10 16.667c1.86 0 3.437-.646 4.729-1.938 1.292-1.291 1.938-2.868 1.938-4.729 0-.333-.021-.656-.063-.969a4.032 4.032 0 0 0-.23-.906 7.705 7.705 0 0 1-1.79.208A8.156 8.156 0 0 1 11 7.521 8.32 8.32 0 0 1 8.125 5.25a8.216 8.216 0 0 1-1.906 2.823 8.14 8.14 0 0 1-2.886 1.802V10c0 1.861.646 3.438 1.938 4.73 1.291 1.29 2.868 1.937 4.729 1.937Zm0 1.666a8.115 8.115 0 0 1-3.25-.656 8.416 8.416 0 0 1-2.646-1.781 8.415 8.415 0 0 1-1.781-2.646A8.115 8.115 0 0 1 1.667 10c0-1.153.218-2.236.656-3.25a8.415 8.415 0 0 1 1.781-2.646A8.415 8.415 0 0 1 6.75 2.323 8.115 8.115 0 0 1 10 1.667c1.153 0 2.236.218 3.25.656a8.416 8.416 0 0 1 2.646 1.781 8.415 8.415 0 0 1 1.78 2.646 8.115 8.115 0 0 1 .657 3.25 8.115 8.115 0 0 1-.656 3.25 8.415 8.415 0 0 1-1.781 2.646 8.416 8.416 0 0 1-2.646 1.781 8.114 8.114 0 0 1-3.25.656ZM8.875 3.437a6.68 6.68 0 0 0 2.375 2.344c1 .59 2.11.886 3.333.886.195 0 .382-.01.563-.032.18-.02.368-.045.562-.073a6.68 6.68 0 0 0-2.375-2.343c-1-.59-2.11-.886-3.333-.886-.195 0-.382.01-.563.032-.18.02-.368.045-.562.072ZM3.687 7.896a6.656 6.656 0 0 0 1.855-1.563 6.633 6.633 0 0 0 1.187-2.146A6.656 6.656 0 0 0 4.875 5.75a6.634 6.634 0 0 0-1.188 2.146Z"></path>

export async function renderRegisterPage(mainElement : HTMLElement){
    const logged = await authService.isValid();
    if (logged){
        router.navigate('/home');
        return;
    }
    setNavbarStatus("REGISTER A NEW ACCOUNT");
    mainElement.innerHTML = `<div class="signup-container">
            <h1 class="registerH1">
                register
            </h1>
            <form id="signupForm" class="registerForm">
                <div class="relative">
                    <div class="registerFormInputDiv">
                        <svg class="registerFormSvg" fill="currentColor" viewBox="0 0 20 20">
                            <path stroke-width="1" d="M7.5 11.875c-.292 0-.538-.1-.74-.302a1.006 1.006 0 0 1-.302-.74c0-.291.1-.538.302-.74.202-.2.448-.301.74-.301s.538.1.74.302c.2.201.301.448.301.74 0 .291-.1.537-.302.739a1.006 1.006 0 0 1-.74.302Zm5 0c-.292 0-.538-.1-.74-.302a1.006 1.006 0 0 1-.302-.74c0-.291.1-.538.302-.74.202-.2.448-.301.74-.301.291 0 .538.1.74.302.2.201.301.448.301.74 0 .291-.1.537-.302.739a1.006 1.006 0 0 1-.74.302ZM10 16.667c1.86 0 3.437-.646 4.729-1.938 1.292-1.291 1.938-2.868 1.938-4.729 0-.333-.021-.656-.063-.969a4.032 4.032 0 0 0-.23-.906 7.705 7.705 0 0 1-1.79.208A8.156 8.156 0 0 1 11 7.521 8.32 8.32 0 0 1 8.125 5.25a8.216 8.216 0 0 1-1.906 2.823 8.14 8.14 0 0 1-2.886 1.802V10c0 1.861.646 3.438 1.938 4.73 1.291 1.29 2.868 1.937 4.729 1.937Zm0 1.666a8.115 8.115 0 0 1-3.25-.656 8.416 8.416 0 0 1-2.646-1.781 8.415 8.415 0 0 1-1.781-2.646A8.115 8.115 0 0 1 1.667 10c0-1.153.218-2.236.656-3.25a8.415 8.415 0 0 1 1.781-2.646A8.415 8.415 0 0 1 6.75 2.323 8.115 8.115 0 0 1 10 1.667c1.153 0 2.236.218 3.25.656a8.416 8.416 0 0 1 2.646 1.781 8.415 8.415 0 0 1 1.78 2.646 8.115 8.115 0 0 1 .657 3.25 8.115 8.115 0 0 1-.656 3.25 8.415 8.415 0 0 1-1.781 2.646 8.416 8.416 0 0 1-2.646 1.781 8.114 8.114 0 0 1-3.25.656ZM8.875 3.437a6.68 6.68 0 0 0 2.375 2.344c1 .59 2.11.886 3.333.886.195 0 .382-.01.563-.032.18-.02.368-.045.562-.073a6.68 6.68 0 0 0-2.375-2.343c-1-.59-2.11-.886-3.333-.886-.195 0-.382.01-.563.032-.18.02-.368.045-.562.072ZM3.687 7.896a6.656 6.656 0 0 0 1.855-1.563 6.633 6.633 0 0 0 1.187-2.146A6.656 6.656 0 0 0 4.875 5.75a6.634 6.634 0 0 0-1.188 2.146Z"></path>
                        </svg>
                    </div>
                    <input class="registerFormInput" placeholder="Username" type="text" id="username" name="username" required>
                </div>

                <div class="relative">
                    <div class="registerFormInputDiv">
                        <svg class="registerFormSvg" fill="currentColor" viewBox="0 0 21 21">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M10.5 19.25a8.52 8.52 0 0 1-3.412-.69 8.835 8.835 0 0 1-2.779-1.87 8.836 8.836 0 0 1-1.87-2.778A8.52 8.52 0 0 1 1.75 10.5c0-1.21.23-2.348.69-3.412a8.836 8.836 0 0 1 1.87-2.779 8.836 8.836 0 0 1 2.778-1.87A8.52 8.52 0 0 1 10.5 1.75c1.21 0 2.348.23 3.412.69a8.836 8.836 0 0 1 2.779 1.87 8.835 8.835 0 0 1 1.87 2.778 8.52 8.52 0 0 1 .689 3.412v1.269c0 .86-.295 1.593-.886 2.198-.59.605-1.316.908-2.177.908-.51 0-.991-.11-1.443-.328a3.084 3.084 0 0 1-1.138-.94c-.423.422-.9.74-1.433.95a4.49 4.49 0 0 1-1.673.318c-1.21 0-2.242-.427-3.095-1.28-.853-.853-1.28-1.885-1.28-3.095 0-1.21.427-2.242 1.28-3.095.853-.853 1.885-1.28 3.095-1.28 1.21 0 2.242.427 3.095 1.28.853.853 1.28 1.885 1.28 3.095v1.269c0 .379.124.7.372.962.248.263.561.394.94.394.38 0 .693-.131.941-.394a1.35 1.35 0 0 0 .372-.962V10.5c0-1.954-.678-3.61-2.034-4.966C14.109 4.178 12.454 3.5 10.5 3.5c-1.954 0-3.61.678-4.966 2.034C4.178 6.891 3.5 8.546 3.5 10.5c0 1.954.678 3.61 2.034 4.966C6.891 16.822 8.546 17.5 10.5 17.5h4.375v1.75H10.5Zm0-6.125c.73 0 1.349-.255 1.86-.766.51-.51.765-1.13.765-1.859 0-.73-.255-1.349-.766-1.86a2.531 2.531 0 0 0-1.859-.765c-.73 0-1.349.255-1.86.766-.51.51-.765 1.13-.765 1.859 0 .73.255 1.349.766 1.86.51.51 1.13.765 1.859.765"></path>
                        </svg>
                    </div>
                    <input class="registerFormInput" placeholder="Email" type="email" id="email" name="email" required>
                </div>

                <div class="relative">
                    <div class="registerFormInputDiv">
                        <svg class="registerFormSvg" fill="currentColor" viewBox="0 0 22 22">
                            <path d="M6.417 16.5c-1.528 0-2.827-.535-3.896-1.604C1.45 13.826.917 12.528.917 11S1.45 8.174 2.52 7.104C3.59 6.034 4.889 5.5 6.417 5.5c1.008 0 1.932.252 2.772.756a5.664 5.664 0 0 1 1.994 1.994h9.9v5.5H19.25v2.75h-5.5v-2.75h-2.567a5.665 5.665 0 0 1-1.994 1.994 5.29 5.29 0 0 1-2.772.756Zm0-1.833c1.008 0 1.818-.31 2.429-.928.61-.62.977-1.227 1.1-1.822h5.637v2.75h1.833v-2.75h1.834v-1.834H9.946c-.123-.595-.49-1.203-1.1-1.822-.611-.618-1.421-.928-2.43-.928-1.008 0-1.871.36-2.59 1.077C3.11 9.128 2.75 9.992 2.75 11c0 1.008.359 1.871 1.077 2.59.718.718 1.581 1.077 2.59 1.077Zm0-1.834c.504 0 .935-.18 1.294-.538.36-.36.539-.79.539-1.295 0-.504-.18-.936-.539-1.295a1.765 1.765 0 0 0-1.295-.538c-.504 0-.935.18-1.294.538-.36.36-.539.79-.539 1.295 0 .504.18.936.539 1.295.359.359.79.538 1.295.538Z"></path>
                        </svg>
                    </div>
                    <input class="registerFormInput" placeholder="Password" type="password" id="password" name="password" autocomplete="new-password" required>
                </div>

                <div class="relative">
                    <div class="registerFormInputDiv flex flex-col">
                        <svg class="registerFormSvg mt-1.5" fill="currentColor" viewBox="0 0 22 22">
                            <path d="M6.417 16.5c-1.528 0-2.827-.535-3.896-1.604C1.45 13.826.917 12.528.917 11S1.45 8.174 2.52 7.104C3.59 6.034 4.889 5.5 6.417 5.5c1.008 0 1.932.252 2.772.756a5.664 5.664 0 0 1 1.994 1.994h9.9v5.5H19.25v2.75h-5.5v-2.75h-2.567a5.665 5.665 0 0 1-1.994 1.994 5.29 5.29 0 0 1-2.772.756Zm0-1.833c1.008 0 1.818-.31 2.429-.928.61-.62.977-1.227 1.1-1.822h5.637v2.75h1.833v-2.75h1.834v-1.834H9.946c-.123-.595-.49-1.203-1.1-1.822-.611-.618-1.421-.928-2.43-.928-1.008 0-1.871.36-2.59 1.077C3.11 9.128 2.75 9.992 2.75 11c0 1.008.359 1.871 1.077 2.59.718.718 1.581 1.077 2.59 1.077Zm0-1.834c.504 0 .935-.18 1.294-.538.36-.36.539-.79.539-1.295 0-.504-.18-.936-.539-1.295a1.765 1.765 0 0 0-1.295-.538c-.504 0-.935.18-1.294.538-.36.36-.539.79-.539 1.295 0 .504.18.936.539 1.295.359.359.79.538 1.295.538Z"></path>
                        </svg>
                        <svg class="registerFormSvg -mt-1.5" fill="currentColor" viewBox="0 0 22 22">
                            <path d="M6.417 16.5c-1.528 0-2.827-.535-3.896-1.604C1.45 13.826.917 12.528.917 11S1.45 8.174 2.52 7.104C3.59 6.034 4.889 5.5 6.417 5.5c1.008 0 1.932.252 2.772.756a5.664 5.664 0 0 1 1.994 1.994h9.9v5.5H19.25v2.75h-5.5v-2.75h-2.567a5.665 5.665 0 0 1-1.994 1.994 5.29 5.29 0 0 1-2.772.756Zm0-1.833c1.008 0 1.818-.31 2.429-.928.61-.62.977-1.227 1.1-1.822h5.637v2.75h1.833v-2.75h1.834v-1.834H9.946c-.123-.595-.49-1.203-1.1-1.822-.611-.618-1.421-.928-2.43-.928-1.008 0-1.871.36-2.59 1.077C3.11 9.128 2.75 9.992 2.75 11c0 1.008.359 1.871 1.077 2.59.718.718 1.581 1.077 2.59 1.077Zm0-1.834c.504 0 .935-.18 1.294-.538.36-.36.539-.79.539-1.295 0-.504-.18-.936-.539-1.295a1.765 1.765 0 0 0-1.295-.538c-.504 0-.935.18-1.294.538-.36.36-.539.79-.539 1.295 0 .504.18.936.539 1.295.359.359.79.538 1.295.538Z"></path>
                        </svg>
                    </div>
                    <input class="registerFormInput" placeholder="Confirm Password" type="password" id="confirmPassword" name="confirmPassword" autocomplete="new-password" required>
                </div>
                <div class="pt-4 flex justify-end">
                    <button type="submit" class="arrow-button">
                        <svg class="arrow-buttonSvg" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18.8707 15.1667H4.6665V12.8333H18.8707L12.3373 6.3L13.9998 4.66667L23.3332 14L13.9998 23.3333L12.3373 21.7L18.8707 15.1667Z" fill="currentColor"/>
                        </svg>
                    </button>
                </div>
            </form>
        </div>
    `;

    const form = document.getElementById("signupForm");
    if(form){
        form.addEventListener("submit", async (event) => {
            event.preventDefault();
            const username = (event.target as HTMLFormElement).username.value;
            const email = (event.target as HTMLFormElement).email.value;
            const password = (event.target as HTMLFormElement).password.value;
            const confirmPassword = (event.target as HTMLFormElement).confirmPassword.value;

            if(password !== confirmPassword){
                setNavbarError(`Error password and confirm password doesnt match`);
                return;
            }

            const escapeUsername = escapeHtml(username);
            const escapeEmail = escapeHtml(email);
            //console.log(escapeUsername, escapeEmail, password, confirmPassword);
            const avatar_url : string = (process.env.NODE_ENV === "production"
                ? "https://" : "http://") + "localhost:3000/uploads/alien-svgrepo-com.svg"
            try{
                const User = await userApi.register({username: escapeUsername, email: escapeEmail, password, avatar_url});
                if(User){
                    //console.log('User crée avec succes')
                    //console.log(User);
                };
                const socket = await messagingService.getWebSocket();
                if(!socket){
                  await renderNavBar();
                  userApi.logout(User.user.id);
                  router.navigate('/profil');
                }
                authService.setAccessToken(User.AccessToken);
                await renderNavBar();
                router.navigate("/home");
            }
            catch (err : any){
                const status = document.getElementById("status");
                if(err.status == 401){
                    alert("identifiant/email deja utilisé");
                }
                else{
                    setNavbarError(`${err}`);
                }
                //alert(`Erreur lors de l'inscription : ${err}`);
            }
        });
    }
}