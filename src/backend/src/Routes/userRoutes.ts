import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createUser,
        getUserById,
        authenticateUser,
        authenticateUsername,
        getPlayerStats,
        getUserByEmail,
        updateUser,
        updatePassword,
        get2FaOption,
        change2FaOption,
        getUserByUsername,
        updateUserOnlineStatus, 
        updateUserLastSeen,
        VerifyUserOnlineStatus,
        VerifyUserOfflineStatus,
        setCliToken,
        getCliToken,
        getUsernameById,
        getMatchHistory,
        createChatBot} from "../services/userService.js"

import { sendEmail, generateRandomCode, storeRandomCode, getStoredCode } from "../services/EmailService.js";
import { access } from "node:fs";
import { getFriends,
         getPendingRequest,
         searchUser,
         sendFriendRequest,
         acceptFriendRequest,
         rejectFriendRequest, 
         removeFriend,
         blockUser,
         getBlockedUser,
         unblockUser} from "../services/FriendShipService.js";
import {broadcast_message} from "../Routes/MessagingRoutes.js";
// imports for the tournament
import { getAllUsersWithStats,
            getOrCreateCurrentTournament,
            addNewTournament,
            getLatestCompletedRoundNumber,
            updateTournamentStatus,
            getTournamentByTypeAndStatus,
            getPendingRoundForTournament,
            addTournamentPlayer,
            getTournamentPlayers, 
            deleteTournamentPlayer,
            addTournamentMatch,
            addTournamentWinner,
            getMatchesByRound,
            updateMatchResult,
            getMatchById,
            getMatchWinnersByRound,
            getMatchesByRoundWithAliases,
            updatePlayerStatsAfterTournament,
            getMatchInfoByMatchId,
            getAllPlayedMatches,
            getPendingMatchIdForUser} from "../services/TournamentService.js";

import { OAuth2Namespace } from '@fastify/oauth2';

declare module 'fastify' {
  interface FastifyInstance {
    googleOAuth2: OAuth2Namespace;
  }
}

interface RegisterRequest {
    body : {
        username: string;
        password: string;
        email: string;
        avatar_url?: string;
    }
}
interface updatePassData {
    actualPass : string;
    newPass : string;
}
interface UserIdParam {
    Params: {
      id: string;
    }
}

const isTournamentLaunched = new Map<string, boolean>();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function authenticateToken(request : FastifyRequest<any>, reply : FastifyReply){
    const authHeader = request.headers['authorization'];
    const authToken = authHeader && authHeader.split(' ')[1];
    //console.log(`verification authtoken :`)
    //console.log(authToken);
    if(!authHeader || !authToken){
        return reply.code(401).send({error: 'No authorization header found'});
    }
    try{
        const decoded = request.server.jwt.verify(authToken);
        //console.log("decoded : ");
        //console.log(decoded);
        request.user = decoded;
    }
    catch(err){
        //console.log("err : ");
        //console.log(err);
        return reply.code(401).send({error: 'Invalid token'});
    }
}

export default function userRoutes(fastify: FastifyInstance){
 
    fastify.post('/register', async (request : FastifyRequest, reply : FastifyReply) => {
        try{
        const {username, password, email, avatar_url} = request.body as RegisterRequest['body'];
        

        //maybe useless since html form already verify if the input is empty
        if(!username || !password || !email){
            reply.status(400).send({error: 'Please provide a username, password and email'});
            return;
        }

        const userId = await(createUser({username, email, password, avatar_url, auth_provider: "local"}));
        const updateOnlineStatus = await VerifyUserOnlineStatus(userId);
        const User = await getUserById(userId);
        //console.log('register user : ' , User)
        const RefreshToken = fastify.jwt.sign({id : userId}, {expiresIn: '30d'})
        const AccessToken = fastify.jwt.sign({id : userId}, {expiresIn: '15m'})
        reply.setCookie('Refresh_jwt', RefreshToken,{
            httpOnly: true,
            secure: false,
            sameSite: 'strict',
            maxAge : 2592000000, // ? 30days in millisecond not sure 
            path: '/'
        });
        reply.code(201).send({User, AccessToken})
        }
        catch (err: any){
            //console.log(err);
            if (err.message.includes('UNIQUE constraint failed')) {
            if (err.message.includes('email')) {
              return reply.code(401).send({ error: 'Cet email est déjà utilisé' });
            }
            if (err.message.includes('username')) {
              return reply.code(401).send({ error: 'Ce nom d\'utilisateur est déjà utilisé' });
            }
        }
        return reply.code(500).send({ error: 'Erreur lors de l\'inscription' });
    }
    });

    fastify.post('/login', async(request: FastifyRequest, reply: FastifyReply) =>{
        try{
            const {email, password} = request.body as {email: string, password: string};
            const User = await authenticateUser(email, password);
            let AccessToken = null;
            //console.log("console user:");
            //console.log(User);
            if(!User){
                return reply.code(401).send({error: 'Identifiant ou mot de passe incorrect'});
            }
            if(User.two_fa_is_active === 1){
                const RandomCode = generateRandomCode(6);
                const storageresponse = await storeRandomCode(RandomCode, User.email);
                //console.log(storageresponse);
                const response = await sendEmail(User.email, 'Verification Code for trans 2FA',
                    `voici votre code de verification temporaire ${RandomCode} qui restera valide 10min,
                    veuillez le rentrer dans l'application pour confirmer votre connexion`
                )
                //console.log("Réponse de l'envoi d'email:", response);
            }
            else{
                const updateOnlineStatus = await VerifyUserOnlineStatus(User.id);
                const RefreshToken = fastify.jwt.sign({id: User.id}, {expiresIn: '30d'})
                AccessToken = fastify.jwt.sign({id: User.id}, {expiresIn: '15m'})
                reply.setCookie('Refresh_jwt', RefreshToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    maxAge: 2592000000,
                    path: '/'
                });
            }
            reply.code(201).send({User, AccessToken})
        }
        catch(err){
            //console.log(err);
            return reply.code(500).send({error: 'Erreur lors de la connexion'})
        }
    });
    fastify.post('/usernameLogin', async(request: FastifyRequest, reply: FastifyReply) =>{
        try{
            //console.log("pour voir si ca marche");
            const {username, password} = request.body as {username: string, password: string};
            const User = await authenticateUsername(username, password);
            let AccessToken = null;
            //console.log("console user:");
            //console.log(User);
            if(!User){
                return reply.code(401).send({error: 'Identifiant ou mot de passe incorrect'});
            }
            if(User.two_fa_is_active === 1){
                const RandomCode = generateRandomCode(6);
                const storageresponse = await storeRandomCode(RandomCode, User.email);
                //console.log(storageresponse);
                const response = await sendEmail(User.email, 'Verification Code for trans 2FA',
                    `voici votre code de verification temporaire ${RandomCode} qui restera valide 10min,
                    veuillez le rentrer dans l'application pour confirmer votre connexion`
                )
                //console.log("Réponse de l'envoi d'email:", response);
            }
            else{
                const updateOnlineStatus = await VerifyUserOnlineStatus(User.id);
                const RefreshToken = fastify.jwt.sign({id: User.id}, {expiresIn: '30d'})
                AccessToken = fastify.jwt.sign({id: User.id}, {expiresIn: '15m'})
                reply.setCookie('Refresh_jwt', RefreshToken, {
                    httpOnly: true,
                    secure: false,
                    sameSite: 'strict',
                    maxAge: 2592000000,
                    path: '/'
                });
            }
            reply.code(201).send({User, AccessToken})
        }
        catch(err){
            // console.log(err);
            return reply.code(403).send({error: `Erreur lors de la connexion ${err}`})
        }
    });
    fastify.post('/final-log', async(request: FastifyRequest, reply: FastifyReply)=>{

        try{
            const UserCodeandId = request.body as {Usercode: string, userID : number};
            const UserCode = UserCodeandId.Usercode;
            const UserId = UserCodeandId.userID;
            //const VerifCode = request.cookies['2FARandom'] as string;
            const User = await getUserById(UserId);
            if(!User){
               return (reply.code(500).send({error: "erreur inconnu"}));
            }
            const VerifCode = await getStoredCode(User.email)
            const checkCode = VerifCode?.toString();
            // console.log(checkCode)
            // console.log(UserCode);
            // console.log(UserId);
            if(checkCode === UserCode){
                const RefreshToken = fastify.jwt.sign({id : UserId}, {expiresIn: '30d'})
                const AccessToken = fastify.jwt.sign({id : UserId}, {expiresIn: '15m'})
                reply.setCookie('Refresh_jwt', RefreshToken,{
                httpOnly: true,
                secure: false,
                sameSite: 'strict',
                maxAge : 2592000000, // ? 30days in millisecond not sure 
                path: '/'
                });
                const updateOnlineStatus = await VerifyUserOnlineStatus(UserId);
                //console.log(`update online status ${updateOnlineStatus}`);
                return (reply.code(201).send({AccessToken}));
            }
            reply.code(501).send({error: 'both code doesnt match'});
        }
        catch(err){
            reply.code(500).send({error: err})
        }

    })

    fastify.get('/refreshToken', async (request : FastifyRequest, reply : FastifyReply) =>{
        try{
            //maybe other verifications is needed here
            //blacklist token ?
            const RefreshToken = request.cookies.Refresh_jwt;
            if(!RefreshToken){
                return reply.code(204).send({error: 'No refresh token found'});
            }
            
            const userId = (fastify.jwt.verify(RefreshToken) as {id : number}).id;
            if(!userId){
                return reply.code(401).send({error: 'Error validity of refresh token'});
            }
            const AccessToken = fastify.jwt.sign({id : userId}, {expiresIn: '15m'})
            //console.log(AccessToken);
            reply.code(200).send({AccessToken})
        }
        catch(err){
            reply.code(500).send({error: 'Erreur lors de la recuperaction du refresh de l\'accesstoken'})
        }    
    });

    fastify.post('/CliToken', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const {username}  = request.body as { username: string};
            //console.log(username);

            const user = await getUserByUsername(username);
            if(user){
                const retrievToken = await getCliToken(username);
                if(retrievToken){
                    try{
                        const verifuserId = (fastify.jwt.verify(retrievToken) as { id : number}).id;
                        reply.code(201).send({accesstoken : retrievToken, userId : user.id})
                    }
                    catch(err){
                        const newAccesToken = fastify.jwt.sign({id: user.id}, { expiresIn : '50m'});
                        const response = await setCliToken(username, newAccesToken);
                        reply.code(201).send({accesstoken : newAccesToken, userId : user.id});
                    }
                }
                return reply.code(409).send({ error: 'Username already exists. Please use a different one or resume the session.' });
            }
            const userId = await createUser({
            username : username,
            email: username,
            password: "test",
            auth_provider: "cli"
            });

            if (!userId) {
                console.error("User creation failed — userId is null or undefined");
                return reply.code(500).send({ error: 'Failed to create user' });
            }

            const AccessToken = fastify.jwt.sign({ id: userId }, { expiresIn: '50m' });

            if (!AccessToken) {
            console.error("JWT generation failed");
            return reply.code(500).send({ error: 'Failed to generate token' });
            }
            const response = await setCliToken(username, AccessToken);
            //console.log(response);
            //console.log("!!TOKEN REFRESH!! -->", AccessToken);
            reply.code(215).send({ accesstoken : AccessToken, userId });

        } catch (err) {
            //console.error("ERROR in /CliToken:", err);
            reply.code(500).send({
            error: 'Erreur lors de la recuperation du refresh de l\'accesstoken'
            });
        }
    });


    fastify.post('/logout/:id', async (request : FastifyRequest, reply : FastifyReply) =>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            //console.log(userId);
            const updateOnlineStatus = await VerifyUserOfflineStatus(userId);
            const updateUserLastSee = await updateUserLastSeen(userId);
            broadcast_message(userId.toString(), "User logged out successfully", "close_connection");
            //console.log(updateOnlineStatus);
            reply.clearCookie('Refresh_jwt', {
                path: '/',
                httpOnly: true,
                secure: false,
                sameSite: 'strict'   
            });
            reply.code(200).send({message: 'User logged out successfully'});
        }
        catch(err){
            reply.code(408).send({error : err});
        }
    });

    fastify.get('/users/:id', { onRequest: [authenticateToken] }, async (request : FastifyRequest, reply : FastifyReply) =>{
        try{
            //console.log('Params:', request.params);
            const userId =  parseInt((request.params as UserIdParam['Params']).id);
            //console.log(`ID extrait: ${userId}`);
            const user = await getUserById(userId);
            //console.log(user);
            reply.code(200).send({user})
        }
        catch(err){
            //console.log('Erreur dans /users/:id:', err);
            reply.code(500).send({error: 'Erreur lors de la recuperaction du user', err})
        }    
    });

    fastify.get('/user/:userId/username', { onRequest: [authenticateToken] }, async (request : FastifyRequest, reply : FastifyReply) => {
        try {
            const { userId } = request.params as { userId : number };
            if (isNaN(userId)) {
            return reply.status(400).send({ error: 'Invalid user ID' });
            }
            const username = await getUsernameById(userId);
            if (!username) {
                return reply.status(404).send({ error: 'User not found' });
            }
            //console.log(`>>> username: ${username}`);
            //console.log("username type:", typeof username);

            reply.code(200).send({username});
        } catch (err) {
            request.log.error(err);
            reply.status(500).send({ error: 'Internal server error' });
        }
    });

    
    fastify.get('/users/:id/stats', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
          const userId = parseInt((request.params as UserIdParam['Params']).id);
          
          const stats = await getPlayerStats(userId);
          
          reply.send({ stats });
        } catch (err) {
          reply.code(500).send({ error: 'Erreur lors de la récupération des statistiques' });
        }
    });
    fastify.post('/updateUser/:id', {onRequest: [authenticateToken]}, async (request : FastifyRequest, reply : FastifyReply) => {
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {username, email, avatar_url} = request.body as RegisterRequest['body'];
            const rtn = await updateUser(userId, {username, email, avatar_url})
            //console.log(rtn);
            reply.code(200).send({success: 'Utilisateur mis a jour avec succes'})
        }
        catch(err: any){
            //console.log(err);
            if(err.code === 'SQLITE_CONSTRAINT'){
                reply.code(501).send({error: 'Email deja present dans la base de données'})
            }
            reply.code(500).send({error : `${err} Erreur lors de la mise a jour de l\'utilisateur`})
        }
    });
    fastify.post('/updatePassword/:id', {onRequest: [authenticateToken]}, async (request: FastifyRequest, reply: FastifyReply)=> {
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {actualPass, newPass} = request.body as updatePassData;
            const rtn = await updatePassword(userId, actualPass, newPass);
            if(!rtn){
                return (reply.code(501).send({error: "Erreur de MPD"}));
            }
            reply.code(200).send(rtn);
        }
        catch (err){
            reply.code(500).send("erreur mots de passe");
        }
    });
    fastify.get('/TwoFaIsActive/:id', {onRequest: [authenticateToken]}, async (request: FastifyRequest, reply: FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const Verif = await get2FaOption(userId);
            //console.log(Verif);
            if(Verif === 0){
                reply.code(200).send({bool: false});
            }else{
                reply.code(200).send({bool: true});
            }
        }
        catch(err){
            reply.code(500).send({error: "erreur 500 inconnu"});
        }
    });
    fastify.post('/changeTwoFaOption/:id', {onRequest: [authenticateToken]}, async(request: FastifyRequest, reply: FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {isActivated} = request.body as {isActivated :boolean};
            //console.log(isActivated);
            const Verif = await change2FaOption(userId, isActivated);
            //console.log(Verif);
            reply.code(200).send({bool : true})
        }
        catch(err){
            reply.code(500).send({error: "erreur 500 inconnu"});
        }
    });
    fastify.get('/friends/:id', {onRequest: [authenticateToken]}, async (request: FastifyRequest, reply: FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const FriendList = await getFriends(userId);
            reply.code(200).send({FriendList});
        }
        catch(err){
            reply.code(500).send({error: "erreur 500 inconnu"});
        }
    });
    fastify.post('/AddFriend/:id', {onRequest: [authenticateToken]}, async (request: FastifyRequest, reply: FastifyReply)=>{
        try{
            //console.log("/AddFriend/:id")
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {friendName} = request.body as {friendName : string};
            const friendUser = await getUserByUsername(friendName);
            if(!friendUser){
                return reply.code(404).send({error: "Utilisateur non trouvé"});
            }
            const rtn = await sendFriendRequest(userId, friendUser.id);
            reply.code(200).send(rtn);
        }
        catch(err){
            if ((err as string).includes('blocked')) {
                return reply.code(403).send({
                  success: false,
                  error: 'User is blocked.',
                  code: 'USER_BLOCKED'
                });
            }
            if ((err as string).includes('pending')) {
                return reply.code(403).send({
                  success: false,
                  error: 'User is already in pending invitation.',
                  code: 'USER_PENDING'
                });
            }
            if ((err as string).includes('already')) {
                return reply.code(403).send({
                  success: false,
                  error: 'User is already friend with you.',
                  code: 'USER_ALREADY_FRIEND'
                });
            }
            //console.log(err);
            return reply.code(500).send({
                success: false,
                error: 'Une erreur est survenue. Veuillez réessayer plus tard.',
                code: 'INTERNAL_ERROR'
            });
        }
    });
    fastify.get('/PendingRequests/:id', {onRequest: [authenticateToken]}, async (request: FastifyRequest, reply: FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const FriendList = await getPendingRequest(userId);
            reply.code(200).send({FriendList});
        }
        catch(err){
            reply.code(500).send({error: "erreur 500 inconnu"});
        }
    });
    fastify.post('/acceptFriendRequest/:id', {onRequest: [authenticateToken]}, async (request: FastifyRequest, reply: FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {friendId} = request.body as {friendId : string};
            const response = await acceptFriendRequest(parseInt(friendId), userId);
            reply.code(200).send({response});
        }
        catch(err){
            reply.code(500).send({error: `erreur ${err} 5050 inconnu`});
        }
    });
    fastify.post('/rejectFriendRequest/:id', {onRequest: [authenticateToken]}, async(request: FastifyRequest, reply: FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {friendId} = request.body as {friendId : string};
            const response = await rejectFriendRequest(parseInt(friendId), userId);
            reply.code(200).send({response});
        }
        catch(err){
            reply.code(500).send({error: `erreur ${err} 5051 inconnu`});
        }
    });
    fastify.post('/removeFriend/:id', {onRequest: [authenticateToken]}, async(request: FastifyRequest, reply: FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {friendId} = request.body as {friendId : string};
            const response = await removeFriend(parseInt(friendId), userId);
            reply.code(200).send({response});
        }
        catch(err){
            reply.code(500).send({error: `erreur ${err} 5051 inconnu`});
        }
    });

    // jst: routes for the tournament
    fastify.get('/users-with-stats',{ onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            // const {auth_provider} = request.params as { auth_provider: string};
            // console.log("auth for user stats:", typeof auth_provider);
            // console.log(`the auth: ${auth_provider}`);
            const users = await getAllUsersWithStats();
            reply.send(users);
        } catch (err) {
            request.log.error(err);
            reply.status(500).send({error: "Failed to fetch users with stats"});
        }
    });
    
    const validTypes = ['cli', 'ai', 'regular'] as const;
    type TournamentType = typeof validTypes[number];
    fastify.get('/tournament/current/:type', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const {type} = request.params as { type: string };
             if (!validTypes.includes(type as TournamentType)) {
                return reply.status(400).send({ error: 'Invalid tournament type' });
            }
            const tournament = await getOrCreateCurrentTournament(type as TournamentType);
            reply.code(200).send(tournament);
        } catch (err) {
            request.log.error(err);
            reply.status(500).send({error: "Failed to create/fetch tournament id"});
        }
    });

    fastify.get('/tournament/new/:type', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const {type} = request.params as { type: string };
             if (!validTypes.includes(type as TournamentType)) {
                return reply.status(400).send({ error: 'Invalid tournament type' });
            }
            const tournament = await addNewTournament(type as TournamentType);
            reply.code(200).send(tournament);
        } catch (err) {
            request.log.error(err);
            reply.status(500).send({error: "Failed to create/fetch tournament id"});
        }
    });

    fastify.get('/tournament/:type/:status', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const {type, status} = request.params as { type: string, status: string };
             if (!validTypes.includes(type as TournamentType)) {
                return reply.status(400).send({ error: 'Invalid tournament type' });
            }
            // console.log(`Querying tournaments with type=${type} and status=${status}`);
            const tournaments = await getTournamentByTypeAndStatus(type as TournamentType, status);

            reply.code(200).send(tournaments);
        } catch (err) {
            request.log.error(err);
            reply.status(500).send({error: "Issue when get tournament by type & status"});
        }
    });

    fastify.post('/tournament/updateStatus', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { tournament_id, status } = request.body as { tournament_id : number, status: string};
        try {
            const success = await updateTournamentStatus(tournament_id, status);
            //console.log(` >>> tournament ${tournament_id} status: ${status}`);
            reply.code(200).send(success);
        }
        catch(err){
            reply.code(500).send({error: 'Error while updating tournament status'});
        }
    });

    fastify.get('/tournament/pendingRound/:id', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        try {
            const roundNumber = await getPendingRoundForTournament(parseInt(id));
            // if (!roundNumber) return reply.code(404).send({ message: `No match with id = ${id}` });
            reply.code(200).send(roundNumber);
        } catch (err) {
            reply.code(500).send({ error: `DB error: ${err}` });
        }
    });
    
    fastify.get('/tournament/:tournamentId/latest-completed-round', { onRequest: [authenticateToken] }, async (request, reply) => {
        
        try {
            const { tournamentId } = request.params as { tournamentId: number };
            const matches = await getLatestCompletedRoundNumber(tournamentId);
            reply.send(matches);
        } catch (err) {
            //console.error(err);
            reply.code(510).send({ error: 'Could not fetch latest completed round' });
        }
        });

    fastify.post('/tournament/addPlayer', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const {player_id, username, tournament_id} = request.body as { player_id : number, username: string, tournament_id: number };
            //console.log(`add player: ${player_id} ${username} ${tournament_id}`);

            const success = await addTournamentPlayer(player_id, username, tournament_id);
           
            reply.code(200).send(success);
        } catch (err: any) {
            if (err.message.includes("Player already added to this tournament")) {
                reply.code(409).send({ error: err.message });
            } else {
                reply.code(500).send({ error: `Internal server error: ${err.message}` });
            }
        }
    });
    fastify.post('/tournament/isactive', async (request: FastifyRequest, reply: FastifyReply) =>{
        try {
            const { userId } = request.body as { userId: string };
            // console.log("typeof userId:", typeof userId, "| value:", userId);
            // console.log(`📌userId of tournament activator: ${userId} `);
            if (isTournamentLaunched.size  === 0){
                isTournamentLaunched.set(userId.toString(), true);
                // console.log(`📌map is empty - user adde:d ${userId}`);
            } else if (!isTournamentLaunched.has(userId.toString())){
                reply.code(403).send("tournament already launched");
            } else if ( isTournamentLaunched.size  !== 0) {
                // console.log(`📌map is NOT empty `);
            }
             reply.code(200).send("tournament has been launched by you");
        } catch (error) {
                // console.log(error);
            reply.code(500).send({error: "Error while isactive"}); 
        }
    });
    fastify.post('/tournament/deactivate', async (request: FastifyRequest, reply: FastifyReply) =>{
        try {
            const userId = request.body as { userId: string };
            if (isTournamentLaunched.has(userId.toString())) {
                isTournamentLaunched.delete(userId.toString());
        
                reply.code(200).send("tournament has been deactivated");
            }
            // console.log(isTournamentLaunched.size); // e.g., 1
            isTournamentLaunched.clear();
            // console.log(isTournamentLaunched.size); // 0
            reply.code(200).send("tournament has been deactivated");

        } catch (error) {
            reply.code(500).send({error: "Error while retrieving tournament players' list"});
            
        }
    });

    fastify.get('/tournament/players/:id', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        try {
            const tournamentPlayersList = await getTournamentPlayers(parseInt(id));
            reply.code(200).send(tournamentPlayersList);
        } catch (err){
            reply.code(500).send({error: "Error while retrieving tournament players' list"});
        }
    });

    fastify.post('/tournament/addMatch', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { tournament_id, round, player1_id, player2_id, waiter_id } = request.body as { 
                    tournament_id: number, 
                    round: number, 
                    player1_id: number, 
                    player2_id: number, 
                    waiter_id: number | null};
            const match_id = await addTournamentMatch(tournament_id, round, player1_id, player2_id, waiter_id);
            reply.code(200).send(match_id);
        } catch (err){
            reply.code(500).send({error: "Error while updating matches table"});
        }
    });

    fastify.post('/tournament/deletePlayer', { onRequest: [authenticateToken] }, async(request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { alias } = request.body as {alias : string};
            const response = await deleteTournamentPlayer(alias);
            reply.code(200).send({ success: true, message: `Deleted ${alias}` });
        }
        catch(err){
            reply.code(500).send({error: `Error ${err} deleting player`});
        }
    });

    fastify.get('/tournament/:id/matches/:roundNumber', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { id, roundNumber } = request.params as { id: number, roundNumber: number };
            //console.log(`TOURNAMENT to update: ${id} ---- ROUND ${roundNumber}`);
            const matches = await getMatchesByRoundWithAliases(id, roundNumber);
            reply.code(200).send(matches);
        }
        catch(err){
            reply.code(500).send({error: `Error ${err} retrieving the matches`});
        }
    });

    // fastify.get('/tournament/match/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    //     try {
    //         const { userId } = request.params as { userId: number };
    //         const match = await getPendingMatch(userId);
    //         reply.code(200).send(match);
    //     }
    //     catch(err){
    //         reply.code(500).send({error: `Error ${err} retrieving the pending match`});
    //     }
    // });

    fastify.post('/tournament/match/addResult', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { match_id, player1_score, player2_score, winner_id } = request.body as {
                match_id: number, 
                player1_score: number,
                player2_score: number,
                winner_id: number};
            //console.log(`match result to update: ${match_id}, ${player1_score}, ${player2_score}, ${winner_id}`);
            //console.log("match_id type:", typeof match_id);
            const success = await updateMatchResult(match_id, player1_score, player2_score, winner_id);
            reply.code(200).send(success);
        }
        catch(err){
            reply.code(500).send({error: `Error ${err} updating match result`});
        }
    });

    // to debug issue updating match results
    fastify.get('/debug/match/:id', { onRequest: [authenticateToken] }, async (request, reply) => {
        const { id } = request.params as { id: string };
        try {
            const match = await getMatchById(parseInt(id));
            if (!match) 
                return reply.code(404).send({ message: `No match with id = ${id}` });
            reply.send(match);
        } catch (err) {
            reply.code(500).send({ error: `DB error: ${err}` });
        }
    });

    fastify.post('/tournament/addWinner', { onRequest: [authenticateToken] }, async(request: FastifyRequest, reply: FastifyReply) => {
        try {
            const {tournamentId, winner_id} = request.body as {tournamentId: number, winner_id: number};
            const success = await addTournamentWinner(tournamentId, winner_id);
            reply.code(200).send(success);
        } catch (err) {
            reply.code(500).send({ error: `DB error: ${err}` });
        }
    });

    fastify.get('/tournament/:tournamentId/matchWinners/:roundNumber', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { tournamentId, roundNumber } = request.params as { tournamentId: number, roundNumber: number };
        try {
            const winners = await getMatchWinnersByRound(tournamentId, roundNumber);
            if (!winners) 
                return reply.code(404).send({ message: `No winners for round = ${roundNumber}` });
            reply.code(200).send(winners);
        } catch (err) {
            reply.code(500).send({ error: `DB error: ${err}` });
        }
    });

    fastify.post('/tournament/updatePlayerStats', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { tournamentId } = request.body as { tournamentId: number };
        try {
            await updatePlayerStatsAfterTournament(tournamentId);
            reply.code(200).send(true);
        } catch (err) {
            reply.code(500).send({ error: `DB error: ${err}` });
        }
    });

    fastify.get('/match/:matchId', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { matchId } = request.params as { matchId: number};
        try {
            const matchInfo =  await getMatchInfoByMatchId(matchId);
            reply.code(200).send(matchInfo);
        } catch (err) {
            reply.code(510).send({ error: `DB error: ${err}` });
        }
    
    });

    fastify.get('/:tournamentId/pending-match/:userId', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        const { userId, tournamentId } = request.params as {userId: number, tournamentId: number};
        try {
            const match_id =  await getPendingMatchIdForUser(userId, tournamentId);
            reply.code(200).send(match_id);
        } catch (err) {
            reply.code(510).send({ error: `DB error: ${err}` });
        }
    
    });

    // Get all played matches for a tournament
    fastify.get('/tournament/:tournamentId/played-matches', { onRequest: [authenticateToken] }, async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { tournamentId } = request.params as { tournamentId: number};
            const matches = await getAllPlayedMatches(tournamentId);
            reply.send(matches);
        } catch (err) {
            reply.code(512).send({ error: 'Failed to retrieve played matches' });
        }
    });

    fastify.post('/blockUser/:id', {onRequest: [authenticateToken]}, async(request: FastifyRequest, reply: FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {friendId} = request.body as {friendId : string};
            const response = await blockUser(parseInt(friendId), userId);
            reply.code(200).send({response});
        }
        catch(err){
            reply.code(500).send({error: `erreur ${err} 5058 inconnu`});
        }
    }),
    fastify.post('/unblockUser/:id', {onRequest: [authenticateToken]}, async(request: FastifyRequest, reply: FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const {friendId} = request.body as {friendId : string};
            const response = await unblockUser(parseInt(friendId), userId);
            reply.code(200).send({response});
        }
        catch(err){
            reply.code(500).send({error: `erreur ${err} 5059 inconnu`});
        }
    }),
    fastify.get('/getBlockedUsers/:id', {onRequest: [authenticateToken]}, async(request: FastifyRequest, reply: FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const response = await getBlockedUser(userId);
            //console.log(response);
            reply.code(200).send({response});
        }
        catch(err){
            reply.code(500).send({error: `erreur ${err} 5059 inconnu`});
        }
    }),
    fastify.post('/updateUserLastSeen/:id', {onRequest : [authenticateToken]}, async(request : FastifyRequest, reply : FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const response = await updateUserLastSeen(userId);
            //console.log(response);
            reply.code(200).send({response});
        }
        catch(err){
            reply.code(500).send({error: `erreur ${err} 5600 inconnu`});
        }
    }),
    fastify.post('/updateUserOnlineStatus/:id', {onRequest : [authenticateToken]}, async(request : FastifyRequest, reply : FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const response = await updateUserOnlineStatus(userId);
            //console.log(response);
            reply.code(200).send({response});
        }
        catch(err){
            reply.code(500).send({error: `erreur ${err} 5600 inconnu`});
        }
    }),
    fastify.post('/VerifyUserOnlineStatus/:id', {onRequest : [authenticateToken]}, async(request : FastifyRequest, reply : FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const response = await VerifyUserOnlineStatus(userId);
            //console.log(response);
            reply.code(200).send({response});
        }
        catch(err){
            reply.code(500).send({error: `erreur ${err} 5600 inconnu`});
        }
    }),
    fastify.post('/UploadProfilAvatar/:id', { onRequest : [authenticateToken]}, async(request : FastifyRequest, reply : FastifyReply)=> {
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const data = await request.file();
            if (!data) {
                return reply.code(400).send({ error: 'Aucun fichier reçu' });
            }
            const buffer = await data.toBuffer();
            const filename = `${Date.now()}-${data.filename}`;
            const uploadPath = path.join(__dirname, 'uploads', filename);
            await fs.promises.writeFile(uploadPath, buffer);
            const updateAvatar = await updateUser(userId, 
                {avatar_url: (process.env.NODE_ENV === "production"
                    ? "https://"
                    : "http://") 
                        + `localhost:3000/uploads/${filename}`});
            //console.log(`update avatar : ${updateAvatar}`)
            return reply.send({
                message: 'Fichier uploadé avec succès',
                filename,
                url: `/uploads/${filename}`,
            });
        }
        catch(err){
            reply.code(500).send({error: `${err}`});
        }
    }),
    fastify.get('/getMatchHistory/:id', {onRequest : [authenticateToken]}, async(request : FastifyRequest, reply : FastifyReply)=>{
        try{
            const userId = parseInt((request.params as UserIdParam['Params']).id);
            const matchHistory = await getMatchHistory(userId);
            //console.log("VOICI L HISTORIQUE DES MATCHS HAHA");
            //console.log(matchHistory);  
            reply.code(200).send({matchHistory});
        }
        catch(err){
            reply.code(500).send({error: `${err}`});
        }
    }),
    fastify.get('/login/google', async (request: FastifyRequest, reply: FastifyReply) => {
        fastify.googleOAuth2.generateAuthorizationUri(
            request,
            reply,
            (err: Error | null, authorizationEndpoint: string) => {
                if (err) {
                    request.log.error(err);
                    return reply.code(500).send({ error: 'Erreur lors de la génération de l\'URI d\'autorisation' });
                }
                reply.redirect(authorizationEndpoint);
            }
        );
    }),
    
    // Callback pour l'authentification Google
    fastify.get('/login/google/callback', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const { token } = await fastify.googleOAuth2.getAccessTokenFromAuthorizationCodeFlow(request);
            let redirect_url : string = process.env.NODE_ENV === "production" ? 'https://localhost:3001/home' : 'http://localhost:3001/home';
           // console.log(redirect_url);
            // Récupérer les informations de l'utilisateur Google
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
                headers: {
                    Authorization: `Bearer ${token.access_token}`
                }
            });
            
            if (!userInfoResponse.ok) {
                throw new Error('Impossible de récupérer les informations utilisateur');
            }
            
            const userInfo = await userInfoResponse.json();
            
            let user = await getUserByEmail(userInfo.email);
            let userId;
            
            if (!user) {
                const randomPassword = Math.random().toString(36).slice(-10);
                
                userId = await createUser({
                    username: userInfo.name || userInfo.email.split('@')[0],
                    email: userInfo.email,
                    password: randomPassword, // Mot de passe aléatoire
                    avatar_url: userInfo.picture,
                    auth_provider: 'google'
                });
                
                await VerifyUserOnlineStatus(userId);
                user = await getUserById(userId);
                redirect_url = process.env.NODE_ENV === "production" ? 'https://localhost:3001/home' : 'http://localhost:3001/home';
            } else {
                userId = user.id;
                const TwoFaIsActive = await get2FaOption(userId);
                //console.log(`TwoFaIsActive = ${TwoFaIsActive}`);
                if(TwoFaIsActive === 1)
                {
                    const RandomCode = generateRandomCode(6);
                    const storageresponse = await storeRandomCode(RandomCode, user.email);
                    //console.log(storageresponse);
                    const response = await sendEmail(user.email, 'Verification Code for trans 2FA',
                        `voici votre code de verification temporaire ${RandomCode} qui restera valide 10min,
                        veuillez le rentrer dans l'application pour confirmer votre connexion`
                        )
                    //console.log("Réponse de l'envoi d'email:", response);
                    redirect_url = process.env.NODE_ENV === "production" ? `https://localhost:3001/twofa/${userId}` : `http://localhost:3001/twofa/${userId}`;
                    return reply.redirect(redirect_url);
                }
                await VerifyUserOnlineStatus(userId);
            }
            
            const RefreshToken = fastify.jwt.sign({ id: userId }, { expiresIn: '30d' });
            const AccessToken = fastify.jwt.sign({ id: userId }, { expiresIn: '15m' });
            
            // Définir les cookies
            reply.setCookie('Refresh_jwt', RefreshToken, {
                httpOnly: true,
                secure: false,
                path: '/',
                sameSite: 'strict'
            });
            
            //console.log(`redirected url = ${redirect_url}`);
            reply.redirect(redirect_url);
            
        } catch (err) {
            request.log.error(err);
            reply.code(500).send({ error: 'Erreur lors de l\'authentification Google' });
        }
    })
    fastify.get('/create-user-ai', async (request: FastifyRequest, reply: FastifyReply) => {
        try {
            const max = 1942;
            const randomNumber = Math.floor(Math.random() * (max + 1));
            const username = "ai" + randomNumber;
            const userId  = await createChatBot({username: username, password: "ai", email: username, auth_provider: "ChatBot"});
            reply.code(200).send({userId, username});
        } catch (err) {
            request.log.error(err);
            reply.code(500).send({ error: 'Error while creating ai user' });
        }
    })
}   
