// WaniKani API documentation: https://docs.api.wanikani.com/20170710/#getting-started


function GetApiTokenFromCache() {
    return localStorage.getItem('apiToken');
}

function SetApiTokenInCache(token) {
    localStorage.setItem('apiToken', token);
}

