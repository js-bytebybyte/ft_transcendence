
import { acceptFriendRequest, blockUser, removeFriend } from "../../../backend/src/services/FriendShipService.js";
import { authService } from "./auth.js";
import { Conversation } from "../pages/renderChatBox.js";
import { updateUserLastSeen } from "../../../backend/src/services/userService.js";
import { router } from "../router.js";
//maybe we should move this outside the code
const API_URL = (process.env.NODE_ENV === "production" 
  ? "https://" : "http://")
    + window.location.hostname + ':3000/api';

// console.log(API_URL);
// console.log(window.location);
// console.log(`window origin ${window.origin}`);
// console.log(window.location.pathname);
// console.log(API_URL);

interface Match {
  id: number,
  tournament_id: number,
  round: number,
  player1_id: number,
  player2_id: number,
  player1_alias: string,
  player2_alias: string,
  player1_score: number,
  player2_score: number,
  winner_id: number | null,
  winner_alias: string | null,
  waiter_id: number | null,
  waiter_alias: string | null,
  match_status: string
}

async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  let token = authService.getAccessToken();

  let valid = await authService.isValid();

  if ((!token || !valid) && !['/login', '/register', '/final-log', '/usernameLogin'].includes(endpoint)) {
    //console.log("→ Token invalide, tentative de refresh");
    try {
      await authService.refreshToken();
      token = authService.getAccessToken();
      valid = await authService.isValid();

      if (!token || !valid) {
        router.navigate('/login');
        throw new Error("Échec du refresh, token toujours invalide");
      }

    } catch (err) {
      //console.log("Erreur lors du refresh depuis fetchApi:", err);
      throw err;
    }
  }
    
    // Ajouter les headers par défaut
    //console.log(`token envoyer depuis fetchApi : ${token}`)
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers
    };
    
    try {
      //console.log(`Envoi de requête à ${API_URL}${endpoint}`);
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
        credentials: 'include'
      });
      
        // Vérifier si la requête a réussi
        if (!response.ok) {
          // Essayer de récupérer le message d'erreur du serveur
          //console.log(response);
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
        }
        
      // Vérifier si la réponse est vide
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return {} as T;
    } catch (error) {
      //to remove on prod
      console.error(`Erreur API (${endpoint}):`, error);
      throw error;
    }
}

export const userApi = {

    register: (UserCreationData: {username: string, email: string, password: string, avatar_url? :string}) =>
      fetchApi<{user: any, AccessToken: string}>('/register',{
        method: 'POST',
        body: JSON.stringify(UserCreationData)
      }),
    getAccessToken: async () => {
      //console.log("tentative de rafraichissement de token depuis le front")
      try{
        const response = await fetch(`${API_URL}/refreshToken`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Erreur ${response.status}: ${response.statusText}`);
        }
        
        return response.json();
      }
      catch(err){
        //console.log("Erreur 223 :", err);
        return null;
      }
    },

    login: (UserLoginData: {email: string, password: string}) =>
      fetchApi<{User: any, AccessToken: string|null}>('/login',{
        method: 'POST',
        body: JSON.stringify(UserLoginData)
    }),

    usernameLogin: (UserLoginData: {username: string, password: string}) =>
      fetchApi<{User: any, AccessToken: string|null}>('/usernameLogin',{
        method: 'POST',
        body: JSON.stringify(UserLoginData)
    }),

    TwoFAlogin: (TwoFAData: {Usercode: string, userID : number}) =>
      fetchApi<{AccessToken: any}>('/final-log',{
          method: 'POST',
          body: JSON.stringify(TwoFAData)
    }),

    logout : (userId : string) =>
      fetchApi<void>(`/logout/${userId}`,{
        method: 'POST',
        body : JSON.stringify({userId})
      }),

    getUserById : (id : string) =>
      fetchApi<{user: any}>(`/users/${id}`, {
        method: 'GET',
    }),

    getUserStats : (id : string) =>
      fetchApi<{stats: any}>(`/users/${id}/stats`, {
        method: 'GET',
    }),

    updateUser : (userId : string, UserUpdateData: {username?: string, email?: string, avatar_url?: string}) =>
      fetchApi<{user: any}>(`/updateUser/${userId}`,{
        method: 'POST',
        body: JSON.stringify(UserUpdateData)
    }),


    TwoFaIsActive : (userId : string) => {
      return fetchApi<{bool : Boolean}>(`/TwoFaIsActive/${userId}`, {
        method : 'GET'
      })
    },
    updatePassword : (userId: string, updatePasswordData: {actualPass: string, newPass : string}) => 
      fetchApi<{User: any}>(`/updatePassword/${userId}`, {
        method: 'POST',
        body: JSON.stringify(updatePasswordData)
    }),
    changeTwoFaOption : (userId : string, isActivated : Boolean) => {
      return fetchApi<{bool : Boolean}>(`/changeTwoFaOption/${userId}`, {
        method: 'POST',
        body: JSON.stringify({isActivated})
      })
    },
    //get complete friend list 
    getFriends : (userId : string) => {
      return fetchApi<{friends: any}>(`/friends/${userId}`, {
        method : 'GET'
      })
    },
    addFriend : (userId : string, friendName : string) => {
      return fetchApi<{friends: any}>(`/AddFriend/${userId}`, {
        method : 'POST',
        body: JSON.stringify({friendName})
      })
    },
    getPendingRequests : (userId : string) => {
      return fetchApi<{FriendList: any}>(`/PendingRequests/${userId}`, {
        method : 'GET'
      })
    },
    acceptFriendRequest : (userId : string, friendId : string) => {
      return fetchApi<{friends: any}>(`/acceptFriendRequest/${userId}`, {
        method : 'POST',
        body: JSON.stringify({friendId})
      })
    },
    rejectFriendRequest : (userId : string, friendId : string) => {
      return fetchApi<{friends: any}>(`/rejectFriendRequest/${userId}`, {
        method : 'POST',
        body: JSON.stringify({friendId})
      })
    },
    getAllUsersStats : () => { // expects an array of user objects with stats
      return fetchApi<Array<{
        id: number,
        username: string,
        avatar_url: string | null,
        auth_provider: string,
        games_played: number,
        games_won: number,
        games_lost: number,
        tournaments_played: number,
        tournaments_won: number,
        total_points_scored: number,
        total_point_conceded: number
      }>>(`/users-with-stats`,{
        method: 'GET'
      })
    },
    getUsernameById: (userId: number) => {
      return fetchApi<{username: string | null}>(`/user/${userId}/username`, {
          method: 'GET'
        });
    },

    getOrCreateCurrentTournament: (type: 'cli' | 'ai' | 'regular') => {
      return fetchApi<{
          id: number;
          name: string;
          created_at: string;
          status: string;
          winner_id: number | null;
          max_players: number;
          participant_count: number;
       }>(`/tournament/current/${type}`,{
        method: 'GET'
      });
    },

    addNewTournament: (type: 'cli' | 'ai' | 'regular') => {
      return fetchApi<{
          id: number;
          name: string;
          created_at: string;
          status: string;
          winner_id: number | null;
          max_players: number;
          participant_count: number;
       }>(`/tournament/new/${type}`,{
        method: 'GET'
      });
    },

    getLatestCompletedRoundMatches: (tournamentId: number) => {
      return fetchApi<number>(`/tournament/${tournamentId}/latest-completed-round`,{
        method: 'GET'
      });
    },

    getTournamentByTypeAndStatus: (type: 'cli' | 'ai' | 'regular', status: string) => { 
       return fetchApi<{
          id: number;
          name: string;
          created_at: string;
          status: string;
          winner_id: number | null;
          max_players: number;
          participant_count: number;
       }>(`/tournament/${type}/${status}`,{
        method: 'GET'
      }); 
    },

    updateTournamentStatus: (tournament_id: number, status: string ) => {
      return fetchApi<boolean>('/tournament/updateStatus', {
        method: 'POST',
        body: JSON.stringify({tournament_id, status})
      })
    },

    getPendingRoundForTournament: (tournament_id: number) => {
      return fetchApi<number>(`/tournament/pendingRound/${tournament_id}`, {
        method: 'GET'
      })
    },

    sendTournamentInvite: (fromUserId : number, toUserId: number) => {
      return fetchApi< { success: boolean }>('/tournament/invite', {
        method: 'POST',
        body: JSON.stringify({fromUserId, toUserId})
      });
    },

    getTournamentInvites: (userId: number) =>{
      return fetchApi<Array<{
        id: number,
        username: string,
        avatar_url: string | null
      } >>(`/tournament/invite/${userId}`, {
        method: 'GET'
      });
    },

    getMatchInfoByMatchId: (matchId: number) => {
      return fetchApi<{
          id: number;
          tournament_id: number;
          round: number,
          player1_id: number,
          player1_alias: string,
          player2_id: number,
          player2_alias: string,
          player1_score: number,
          player2_score: number,
          winner_id: number,
          winner_alias: string | null,
          waiter_id: number | null,
          waiter_alias: string | null,
          match_status: string;
       }>(`/match/${matchId}`,{
        method: 'GET'
      });
    },

    addTournamentPlayer : (player_id: number, username: string, tournament_id: number) => {
      return fetchApi<{ success : boolean }>('/tournament/addPlayer', {
        method: 'POST',
        body: JSON.stringify({player_id, username, tournament_id})
      });
    },

    deleteTournamentPlayer : (alias : string) => {
      return fetchApi< { success : boolean }>('/tournament/deletePlayer',  {
        method: 'POST',
        body: JSON.stringify({alias})
      });
    },

    getTournamentPlayers: (tournament_id: number) => {
      return fetchApi< Array<{
        player_id: number,
        username: string 
      }>>(`/tournament/players/${tournament_id}`, {
        method: 'GET'
      });
    },

    addTournamentMatch: 
    ( tournament_id: number,
      round: number, 
      player1_id: number, 
      player2_id: number, 
      waiter_id: number | null
    ) => {
      return fetchApi<number>('/tournament/addMatch', {
        method: 'POST',
        body: JSON.stringify({ tournament_id, round, player1_id, player2_id, waiter_id})
      });
    },

    activateTournament: (userId: string) =>{
      return fetchApi<any>('/tournament/isactive', {
        method: 'POST',
        body: JSON.stringify({userId})
      })
    },

    deactivateTournament: (userId: string) =>{
      return fetchApi<any>('/tournament/deactivate', {
        method: 'POST',
        body: JSON.stringify({userId})
      })
    },

    addTournamentWinner: (tournamentId: number, winner_id: number) => {
      return fetchApi<boolean>('/tournament/addWinner', {
        method: 'POST',
        body: JSON.stringify({tournamentId, winner_id})
      });
    },

    getPendingMatchIdForUser: (userId : number, tournamentId: number) =>  {
       return fetchApi<number>(`/${tournamentId}/pending-match/${userId}`, {
        method: 'GET'
      });
    },

    getMatchesByRound: (round: number) => {
      return fetchApi< Array<{
        id: number,
        tournament_id: number,
        round: number,
        player1_id: number,
        player2_id: number,
        player1_score: number,
        player2_score: number,
        winner_id: number | null,
        waiter_id: number | null,
        match_status: string
      } >>(`/tournament/matches/${round}`, {
        method: 'GET'
      });
    },

    getMatchesByRoundWithAliases: (tournamentId: number, round: number) => {
      return fetchApi<Array<{
        id: number,
        tournament_id: number,
        round: number,
        player1_id: number,
        player2_id: number,
        player1_alias: string,
        player2_alias: string,
        player1_score: number,
        player2_score: number,
        winner_id: number | null,
        winner_alias: string | null,
        waiter_id: number | null,
        waiter_alias: string | null,
        match_status: string
      }>>(`/tournament/${tournamentId}/matches/${round}`, {
        method: 'GET'
      });
    },

    addMatchResult: 
      (match_id: number,
      player1_score: number,
      player2_score: number,
      winner_id: number) => {
          return fetchApi<boolean>('/tournament/match/addResult', {
            method: 'POST',
            body: JSON.stringify({match_id, player1_score, player2_score, winner_id})
        });
    },

    getMatchWinnersByRound: (tournamendId: number, round: number) => {
      return fetchApi< Array<{
        winner_id: number | null,
      } >>(`/tournament/${tournamendId}/matchWinners/${round}`, {
        method: 'GET'
      });
    },

    updatePlayerStatsAfterTournament: (tournamentId: number) =>{
      return fetchApi<boolean>('/tournament/updatePlayerStats', {
        method: 'POST',
        body: JSON.stringify({ tournamentId})
      });
    },

    getAllPlayedMatches: (tournamentId: number) => {
      return fetchApi<Array<Match>>(`/tournament/${tournamentId}/played-matches`, {
        method: 'GET'
      })
    },
    
    removeFriend : (userId : string, friendId : string)=> {
      return fetchApi<{friends : any}>(`/removeFriend/${userId}`, {
        method : 'POST',
        body: JSON.stringify({friendId})
      })
    },
    blockUser : (userId : string, friendId : string) => {
      return fetchApi<{friends : any}>(`/blockUser/${userId}`, {
        method : 'POST',
        body : JSON.stringify({friendId})
      })
    },
    unblockUser : (userId : string, friendId : string) => {
      return fetchApi<{friends : any}>(`/unblockUser/${userId}`, {
        method : 'POST',
        body : JSON.stringify({friendId})
      })
    },
    getConvAndMsg : (userId : string) => {
      return fetchApi<{Msg : Conversation}>(`/getConvAndMsg/${userId}`,{
        method : 'GET'
      })
    },
    createConversation : (userId : string, friendUsername : string) => {
      return fetchApi<{Msg : any}>(`/createConversation/${userId}`, {
        method : 'POST',
        body: JSON.stringify({friendUsername})
      })
    },
    deleteConversation : (convId : string)=> {
      return fetchApi<{Msg : any}>(`/deleteConversation/${convId}`, {
        method : 'POST',
        body: JSON.stringify({convId})
      })
    },
    getBlockedUsers : (userId : string) => {
      return fetchApi<{friends : any}>(`/getBlockedUsers/${userId}`, {
        method : 'GET'
      })
    },
    updateUserLastSeen : (userId : string) => {
      return fetchApi<{user : any}>(`/updateUserLastSeen/${userId}`, {
        method : 'POST',
        body : JSON.stringify({userId})
      })
    },
    getMessageFromConv : (convId : string) => {
      return fetchApi<{Msg : any}>(`/getMessageFromConv/${convId}`, {
        method : 'GET'
      })
    },
    updateUserOnlineStatus : (userId : string) => {
      return fetchApi<{user : any}>(`/updateUserOnlineStatus/${userId}`, {
        method : 'POST',
        body : JSON.stringify({userId})
      })
    },
    VerifyUserOnlineStatus : (userId : string) => {
      return fetchApi<{user : any}>(`/VerifyUserOnlineStatus/${userId}`, {
        method : 'POST',
        body : JSON.stringify({userId})
      })
    },
    checkIfConversationExists : (userId : string, friendId : string) => {
      return fetchApi<{Msg : any}>(`/checkIfConversationExists/${userId}`, {
        method : 'POST',
        body : JSON.stringify({friendId})
      })
    },
    UploadProfilAvatar : async (userId : string, avatar_url : FormData) => {
      const token = authService.getAccessToken();
      if(!token){
        try{
            //("tentative de rafraichissement de token depuis le front")
            await authService.refreshToken();
        }
        catch(err){
            //console.log("Erreur 675 :", err);
            throw err;
        }
      }
      const response = await fetch(`${API_URL}/UploadProfilAvatar/${userId}`, {
          method: 'POST',
          credentials: 'include',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: avatar_url,});

        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          //console.log(response);
          //console.log(errorData);
          throw {errorcode : response.status, error : errorData};
        }
        return response.json();
    },
      getMatchHistory : async (userId : string) => {
        return fetchApi<{matchHistory: any}>(`/getMatchHistory/${userId}`, {
          method: 'GET',
      });
    },
    createAI: async () => {
      return fetchApi<{userId: number, username: string}>('/create-user-ai', {
        method: 'GET'
      })
    } 

}

    // updateMatchResult: (matchId: number, player1_score: number, player2_score: number, winner: string) => {
    //   return fetchApi<{ updateMsg: string}>('/tournament/updateMatchResult', {
    //     method: 'POST',
    //     body: JSON.stringify({matchId, player1_score, player2_score, winner})
    //   })
    // },
