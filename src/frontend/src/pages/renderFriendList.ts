import { userApi } from "../API/api.js";
import { authService } from "../API/auth.js";
import { router } from "../router.js";
import { renderProfilPage } from "./renderProfilPage.js";
import { handleNewConversation } from "./renderChatBox.js";

export async function renderFriendList(mainElement : HTMLElement){
    //console.log("renderFriendList");
    const logged = await authService.isValid();
    if (!logged){
        router.navigate('/home');
        return;
    }
    const status = document.getElementById("status");
    if(status){
      status.innerHTML = "Friend List";
    }
    const userId = await authService.getUserId();
    if(!userId){
        alert("You must be logged in to view your friend list");
        return;
    }
    const friendList = await userApi.getFriends(userId);
    //console.log(friendList);
    mainElement.innerHTML = `<div id='friendList' class="FriendlistDiv">
                          <div class="rounded-lg p-6 bg-[rgba(0,0,0,0.9)]">
                            <h1 class="text-white text-2xl font-bold mb-6 text-center">Friend List</h1>
                            <div class="space y-4">
                              <button id="addFriendButton" class="Friendlistbtn bg-black">Add Friend</button>
                              <button id="pendingRequestsButton" class="Friendlistbtn bg-black">Pending Requests</button>
                              <button id="blockedUsersButton" class="Friendlistbtn bg-black">Blocked Users</button>
                            </div>
                          </div>
                        </div>`;
    const FriendListDiv = document.getElementById("friendList");
    if(friendList.FriendList.length === 0){
      const nothingElement = document.createElement('div');
      nothingElement.innerHTML = 'NO FRIEND FOUND';
      nothingElement.classList.add('text-center', 'text-black', 'text-2xl', 'font-bold', 'mb-6');
      FriendListDiv?.appendChild(nothingElement);
    }
    else{
      friendList.FriendList.forEach((friend : any)=>{
          FriendListDiv?.appendChild(makeFriendElement(friend, userId));
      })
    }
    const blockedUsersButton = document.getElementById("blockedUsersButton");
    if(blockedUsersButton){
      blockedUsersButton.addEventListener('click', async() => {
        await handleBlockedUsers(userId, mainElement);
      })
    }

    const addFriendButton = document.getElementById("addFriendButton");
    if(addFriendButton){
      addFriendButton.addEventListener('click', async() => {
        await handleNewFriend(userId);
      })
    }

    const pendingRequestsButton = document.getElementById("pendingRequestsButton");
    if(pendingRequestsButton){
      pendingRequestsButton.addEventListener('click', async() => {
        await handlePendingRequests(userId, mainElement);
      })
    }
}
async function handleNewFriend(userId :string){
  const friendName = prompt("Enter the friend Username");
        if(friendName){
          try{
            const response = await userApi.addFriend(userId, friendName);
            //console.log(response);
            const status = document.getElementById("status");
            if(status){
              status.innerHTML = "Friend request sent";
            }
          }
          catch(err){
              const status = document.getElementById("status");
              //console.log(err);
              if(status){
                  status.innerHTML = `${err}`;
              }
            }
          }
}
async function handleBlockedUsers(userId :string, mainElement: HTMLElement){
    mainElement.innerHTML = `<div id='blockedUsers' class="FriendlistDiv">
                                <div class="rounded-lg p-6 bg-[rgba(0,0,0,0.9)]">
                                  <h1 class="text-white text-2xl font-bold mb-6 text-center">Blocked Users</h1>
                                  <div class="flex justify-center mt-4">
                                    <button id="FriendList" class="Friendlistbtn bg-black">Friend List</button>
                                  </div>
                                </div>
                              </div>`;
    const blockedUsersDiv = document.getElementById("blockedUsers");
    const blockedUsers = await userApi.getBlockedUsers(userId);
    //console.log(blockedUsers);
    
    const FriendListButton = document.getElementById("FriendList");
    if(FriendListButton){
      FriendListButton.addEventListener('click', async() => {
        router.navigate('/friendlist');
      })
    }
    if(blockedUsers.response === null){
      //console.log("no blocked user found");
      const nothingElement = document.createElement('div');
      nothingElement.innerHTML = 'NO BLOCKED USER FOUND';
      nothingElement.classList.add('text-center', 'text-black', 'text-2xl', 'font-bold', 'mb-6');
      blockedUsersDiv?.appendChild(nothingElement);
      return;
    }
    else{
      let i = 0;
      for (const blockedUser of blockedUsers.response) {
        if (userId === blockedUser.user_id) {
          continue;
        }
        i++;
        const blockedElement = await makeBlockedUserElement(blockedUser, userId);
        blockedUsersDiv?.appendChild(blockedElement);
      }
      if(i === 0){
        const nothingElement = document.createElement('div');
        nothingElement.innerHTML = 'NO BLOCKED USER FOUND';
        nothingElement.classList.add('text-center', 'text-black', 'text-2xl', 'font-bold', 'mb-6');
        blockedUsersDiv?.appendChild(nothingElement);
      }
    }
}
async function handlePendingRequests(userId :string, mainElement: HTMLElement){
    mainElement.innerHTML = `<div id='pendingRequests' class="FriendlistDiv">
                                <div class="rounded-lg p-6 bg-[rgba(0,0,0,0.9)]">
                                  <h1 class="text-white text-2xl font-bold mb-6 text-center">Friend Request</h1>
                                  <div class="flex justify-center mt-4">
                                    <button id="FriendList" class="Friendlistbtn bg-black">Friend List</button>
                                  </div>
                                </div>
                              </div>`;
    const pendingDiv = document.getElementById("pendingRequests");
    const pendingRequests = await userApi.getPendingRequests(userId);
    //console.log("pendingRequest = ");
    //console.log(pendingRequests);
    if(pendingRequests.FriendList.length === 0){
      const nothingElement = document.createElement('div');
      nothingElement.innerHTML = 'NO FRIEND REQUEST FOUND';
      nothingElement.classList.add('text-center', 'text-black', 'text-2xl', 'font-bold', 'mb-6');
      pendingDiv?.appendChild(nothingElement);
    }
    else{
      let count = 0;
      pendingRequests.FriendList.forEach((pendingRequest : any)=>{
        if(userId != pendingRequest.id){
          pendingDiv?.appendChild(makePendingRequestElement(userId, pendingRequest, mainElement));
          count++;
        }
      })
      if(count === 0){
        const nothingElement = document.createElement('div');
        nothingElement.innerHTML = 'NO FRIEND REQUEST FOUND';
        nothingElement.classList.add('text-center', 'text-black', 'text-2xl', 'font-bold', 'mb-6');
        pendingDiv?.appendChild(nothingElement);
      }
    }
    const FriendListButton = document.getElementById("FriendList");
    if(FriendListButton){
      FriendListButton.addEventListener('click', async() => {
        router.navigate('/friendlist');
      })
    }
}

function makeFriendElement(friend : any, userId : string){
  //console.log("friend element=>");
  //.log(friend);
  const requestElement = document.createElement('div');
  // Générer des IDs uniques pour éviter les conflits
  const uniqueId = Math.random().toString(36).substr(2, 9);
  
  requestElement.innerHTML = `<div id='oneFriendDiv' class="onePendingRequest">
                                <div class="openRequest">
                                   <div class="flex items-center">
                                    <img src="${friend.avatar_url}" alt="${friend.username}" class="w-12 h-12 rounded-full mr-4">                                    
                                    <div>
                                      <h3 class="font-semibold text-lg">${friend.username}</h3>
                                    </div>
                                  </div>
                                  <div class="dropdown">
                                   <button id="dropdownButton_${uniqueId}" class="Friendlistbtn bg-black">menu</button>
                                   <div id="dropdownMenu_${uniqueId}" class="dropdown-menu">
                                     <a href="#" id="optionOne_${uniqueId}">Remove Friend</a>
                                     <a href="#" id="optionTwo_${uniqueId}">Block User</a>
                                     <a href="#" id="optionThree_${uniqueId}">Send Private Message</a>
                                     <a href="#" id="optionFour_${uniqueId}">View Profile</a>
                                   </div>
                                  </div>
                                </div>
                              </div>`;
  
  const dropdownMenu = requestElement.querySelector(`#dropdownMenu_${uniqueId}`) as HTMLElement;
  const dropdownButton = requestElement.querySelector(`#dropdownButton_${uniqueId}`) as HTMLElement;
  
  dropdownButton?.addEventListener("click", (e)=>{
    e.stopPropagation(); // Empêche la propagation de l'événement
    dropdownMenu?.classList.toggle("visible");
  });
  
  document.addEventListener("click", (event)=>{
    if (!dropdownButton?.contains(event.target as Node) && !dropdownMenu?.contains(event.target as Node)) {
        dropdownMenu?.classList.remove("visible");
      }
  });

  //delete option
  const OptionOne = requestElement.querySelector(`#optionOne_${uniqueId}`);
  OptionOne?.addEventListener("click", async(e) => {
    e.preventDefault(); 
    e.stopPropagation();
    const confirm = window.confirm("Are you sure you want to delete this friend ?");

    if (confirm) {
      const mainElement = document.getElementById("app-container");
      const response = await userApi.removeFriend(userId, friend.id);
      //console.log(response);
      if(mainElement){
        router.navigate('/friendlist');}

    } else {
      //console.log("ON retourne");
    }
  });

  // block/unblock option
  const OptionTwo = requestElement.querySelector(`#optionTwo_${uniqueId}`);
  OptionTwo?.addEventListener("click", async(e)=>{
    e.preventDefault();
    e.stopPropagation();
    const confirm = window.confirm("Are you sure you want to block this User ?");

    if(confirm){
      const mainElement = document.getElementById("app-container");
      const response = await userApi.blockUser(userId, friend.id);
      //console.log(response);
      if(mainElement){
        router.navigate('/friendlist');
      }
    }
  });
  //send private message
  const OptionThree = requestElement.querySelector(`#optionThree_${uniqueId}`);
  OptionThree?.addEventListener("click", async(e)=>{
    e.preventDefault();
    e.stopPropagation();
    await handleNewConversation(userId, friend.username);
  })

  //view profil
  const OptionFour = requestElement.querySelector(`#optionFour_${uniqueId}`);
  OptionFour?.addEventListener("click", async(e)=>{
    e.preventDefault();
    e.stopPropagation();
    const mainElement = document.getElementById("app-container");
    if(!mainElement){
      alert("mainElement not found in optionFour friendlist callback");
      return;
    }
    router.setOldPath();
    await renderProfilPage(mainElement, friend.id);
  })
  
  return requestElement;
}
function makePendingRequestElement(userId : string, pendingRequest : any, mainElement : HTMLElement){
    //console.log(pendingRequest);
    const requestElement = document.createElement('div');
    requestElement.innerHTML = `<div id='onePendingRequest' class="onePendingRequest">
                                  <div class="openRequest">
                                    <div class="flex items-center">
                                      <img src="${pendingRequest.avatar_url}" alt="${pendingRequest.username}" class="w-12 h-12 rounded-full mr-4">
                                    <div>
                                      <h3 class="font-semibold text-lg">${pendingRequest.username}</h3>                                    </div>
                                  </div>
                                  <div class="flex space-x-2 px-4">
                                    <button id="acceptButton" class="bg-black hover:bg-green-600 text-white px-3 py-1 rounded-md transition-colors" data-user-id="${pendingRequest.id}" data-action="accept">Accepter</button>
                                    <button id="rejectButton" class="bg-black hover:bg-red-600 text-white px-3 py-1 rounded-md transition-colors" data-user-id="${pendingRequest.id}" data-action="reject">Refuser</button>
                                  </div>
                                </div>
                              </div>`;
    const acceptButton = requestElement.querySelector('[data-action="accept"]');
    const rejectButton = requestElement.querySelector('[data-action="reject"]');
    if(acceptButton){
      acceptButton.addEventListener('click', async() => {
        await userApi.acceptFriendRequest(userId, pendingRequest.id);
        const status = document.getElementById("status");
        if(status){
          status.innerHTML = "Friend request accepted";
        }
        await handlePendingRequests(userId, mainElement);
      })
    }
    if(rejectButton){
      rejectButton.addEventListener('click', async() => {
        await userApi.rejectFriendRequest(userId, pendingRequest.id);
        const status = document.getElementById("status");
        if(status){
          status.innerHTML = "Friend request rejected";
        }
        await handlePendingRequests(userId, mainElement);
      })
    }
    return requestElement;
}
async function makeBlockedUserElement(blockedUser : any, userId : string) : Promise<HTMLElement>{
    const requestElement = document.createElement('div');
    //log(blockedUser);
    const user = await userApi.getUserById(blockedUser.user_id);
    //console.log(user);
    if(userId === blockedUser.user_id){
      return requestElement;
    }
    requestElement.innerHTML = `<div id='oneFriendDiv' class="onePendingRequest">
                                <div class="openRequest">
                                   <div class="flex items-center">
                                    <img src="${user.user.avatar_url}" alt="${user.user.username}" class="w-12 h-12 rounded-full mr-4">                                    
                                    <div>
                                      <h3 class="font-semibold text-lg">${user.user.username}</h3>
                                      <button id="unblockButton" class="Friendlistbtn bg-black">Unblock User</button>
                                    </div>
                                  </div>  
                                </div>`;
    const unblockButton = requestElement.querySelector('#unblockButton');
    if(unblockButton){
      unblockButton.addEventListener('click', async() => {
        try{
          //console.log(userId);
          //console.log(blockedUser.user_id);
          await userApi.unblockUser(userId, blockedUser.user_id);
          const status = document.getElementById("status");
          if(status){
            status.innerHTML = `User Unblocked`;
          }
          const mainElement = document.getElementById("app-container");
          if(mainElement){
            router.navigate('/friendlist');}
        }catch(err){
          alert(err);
        }
      })
    } 
    return requestElement;
} 
