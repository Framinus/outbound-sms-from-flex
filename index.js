require('dotenv').config();
const accountSid = process.env.FLEX_ACCOUNT_SID;
const authToken = process.env.FLEX_AUTH_TOKEN;

const client = require('twilio')(accountSid, authToken);

const myPhone = process.env.MY_PHONE_NUMBER;
const flexPhone = process.env.FLEX_PHONE_NUMBER;
const flexFlowSid = process.env.FLEX_FLOW_SID;
const proxyServiceSid = process.env.PROXY_SERVICE_SID;
const chatServiceSid = process.env.CHAT_SERVICE_SID;

client.flexApi.channel  
    .create({
        target: myPhone,
        taskAttributes: JSON.stringify({
            to: myPhone,
            direction: 'outbound',
            name: 'Blake',
            from: flexPhone,
            targetWorker: 'client:jingraham',
            autoAnswer: true
        }),
        identity: `sms_${myPhone}`,
        chatFriendlyName: 'Outbound Chat',
        flexFlowSid,
        chatUserFriendlyName: 'James'
    })
    .then((channel) => {
        console.log("channel_sid", channel.sid);
        createProxySession(channel.sid)
    })
    .catch((err) => {
        console.log(`Error creating channel: ${err}`);
    })

function createProxySession(channelSid) {
    client.proxy.services(proxyServiceSid)
    .sessions
    .create({
        uniqueName: channelSid,
        mode: 'message-only',
        participants: [{"Identifier": `${myPhone}`}]
    })
    .then((session) => {
        console.log("session sid", session.sid);
        addAgentToProxySession(channelSid, session.sid);
    })
    .catch((err) => {
        console.log(`Error creating proxy session: ${err}`);
    })
}

function addAgentToProxySession(channelSid, sessionSid) {
    client.proxy.services(proxyServiceSid)
        .sessions(sessionSid)
        .participants 
        .create({
            proxyIdentifier: flexPhone,
            friendlyName: myPhone,
            identifier: channelSid,
        })
        .then((participant) => {
            console.log("participant sid", participant.sid);
            getChannelAttributes(channelSid, sessionSid)
        })
        .catch((err) => {
            console.log(`Failed to update attributes: ${err}`);
        })   
}

function getChannelAttributes(channelSid, sessionSid) {
    client.chat.services(chatServiceSid)
        .channels(channelSid)
        .fetch()
        .then((channel) => {
            const initialAttributes = channel.attributes;
            updateChannelAttributeswithProxy(channelSid, sessionSid, initialAttributes)
        })
        .catch((err) => {
            console.log(`Could not return channel attributes: ${err}`);
            return err;
        })
}

function updateChannelAttributeswithProxy(channelSid, sessionSid, initialAttributes) {
    let attributes = JSON.parse(initialAttributes);
    let proxySessionAttr = {proxySession: sessionSid};
    let newAttributes = JSON.stringify(Object.assign(attributes, proxySessionAttr));
    client.chat.services(chatServiceSid)
        .channels(channelSid)
        .update({attributes: newAttributes})
        .then((channel) => {
            console.log(`${channel.friendlyName} has been updated with ${channel.attributes}`);
            return channel.attributes;
        })
        .catch((err) => {
            console.log(`Channel failed to update: ${err}`);
            return err;
        })
};

