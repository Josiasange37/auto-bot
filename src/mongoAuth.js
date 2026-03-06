const { proto, BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys');
const { Session } = require('./db');

const useMongoDBAuthState = async (collectionName) => {
    const writeData = async (data, id) => {
        const idStr = collectionName + '-' + id;
        const serialized = JSON.stringify(data, BufferJSON.replacer);
        await Session.findOneAndUpdate(
            { id: idStr },
            { id: idStr, data: serialized },
            { upsert: true }
        );
    };

    const readData = async (id) => {
        const idStr = collectionName + '-' + id;
        const doc = await Session.findOne({ id: idStr });
        if (doc) {
            return JSON.parse(doc.data, BufferJSON.reviver);
        }
        return null;
    };

    const removeData = async (id) => {
        const idStr = collectionName + '-' + id;
        await Session.deleteOne({ id: idStr });
    };

    let creds = await readData('creds');
    if (!creds) {
        creds = initAuthCreds();
        await writeData(creds, 'creds');
    }

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    await Promise.all(
                        ids.map(async id => {
                            let value = await readData(`${type}-${id}`);
                            if (type === 'app-state-sync-key' && value) {
                                value = proto.Message.AppStateSyncKeyData.fromObject(value);
                            }
                            data[id] = value;
                        })
                    );
                    return data;
                },
                set: async (data) => {
                    const tasks = [];
                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = `${category}-${id}`;
                            if (value) {
                                tasks.push(writeData(value, key));
                            } else {
                                tasks.push(removeData(key));
                            }
                        }
                    }
                    await Promise.all(tasks);
                }
            }
        },
        saveCreds: () => {
            return writeData(creds, 'creds');
        }
    };
};

module.exports = { useMongoDBAuthState };
