const fs = require('fs').promises;
const WOKCommands = require('wokcommands');
const { Client, Events, IntentsBitField, EmbedBuilder, Partials, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const ms = require('ms');
const cron = require('node-cron');
require('dotenv').config();
require('dotenv/config');

const token = process.env.TOKEN; // השתמש בטוקן מתוך .env


// יצירת לקוח הבוט
const client = new Client({
  intents: [
    IntentsBitField.Flags.Guilds,
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.MessageContent,
    IntentsBitField.Flags.GuildMembers,
    IntentsBitField.Flags.GuildVoiceStates,
  ],
  partials: [Partials.Channel],
});


const chosenNumbers = new Map(); // מפת משתמשים ומספרים שנבחרו
const clientId = '1279346212964925481'; // הכנס את ה-clientId של הבוט
const guildId = '1258761406262673489'; // הכנס את ה-guildId של השרת

// הגדרת הפקודות
const commands = [
  {
      name: 'drop',
      description: 'להפעיל דרופ חדש עם פרס.',
      options: [
          {
              name: 'reward',
              type: 3, // STRING
              description: 'הפרס שתקבלו',
              required: true
          }
      ]
  },
  {
    name: 'accept',
    description: 'מאשר הצעות',
  },
  {
    name: 'deny',
    description: 'דוחה הצעות',
  },
  {
    name: 'clear',
    description: 'מנקה הודעות',
    options: [
        {
            name: 'amount',
            type: 3, // STRING
            description: 'כמות הודעות',
            required: true
        }
    ]
  },
  {
    name: 'feedback',
    description: 'שליחת משוב',
    options: [
        {
            name: 'message',
            type: 3, // STRING
            description: 'הקש את המשוב שלך',
            required: true
        }
    ]
  },
  {
    name: 'roll',
    description: 'גלגול קוביה',
    options: [
        {
            name: 'max',
            type: 3, // STRING
            description: 'המקסימום של הקוביה',
            required: true
        }
    ]
  },
  {
    name: 'eventroll',
    description: 'יוצר embed של איוונט הקוביה',
    options: [
        {
            name: 'number',
            type: 3, // STRING
            description: 'מסםר הכפתורים ב embed',
            required: true
        }
    ]
  },
  {
    name: 'removeroll',
    description: 'למחוק רול ממשתמש',
    options: [
        {
            name: 'roll',
            type: 3, // STRING
            description: 'הרול שרוצים למחוק',
            required: true
        }
    ]
  },
  // הוסף פקודות נוספות כאן אם יש
];

// Registering commands with the Discord API
const rest = new REST({ version: '9' }).setToken(token);
(async () => {
  try {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: commands,
      });
      console.log('Commands registered successfully!');
  } catch (error) {
      console.error(error);
  }
})();

// נתיב לקובץ JSON לשמירת ההודעות
const path = './suggestions.json'; // נתיב לקובץ JSON
const suggestionsMap = new Map(); // מפה לשמירת ההצעות

// פונקציה לשמירה לקובץ JSON
async function saveSuggestions() {
  try {
    const data = JSON.stringify(Array.from(suggestionsMap.entries()), null, 2);
    await fs.writeFile(path, data);
    console.log("Suggestions saved successfully.");
  } catch (error) {
    console.error('Error saving suggestions:', error);
  }
}

// פונקציה לקריאה מהקובץ JSON
async function loadSuggestions() {
  try {
    const data = await fs.readFile(path, 'utf8');
    const entries = JSON.parse(data);
    suggestionsMap.clear(); // ניקוי המפה לפני טעינת נתונים חדשים
    entries.forEach(([key, value]) => {
      suggestionsMap.set(key, value);
    });
    console.log("Suggestions loaded successfully.");
  } catch (error) {
    console.error('Error loading suggestions:', error);
  }
}

// פונקציה לבדוק אם קובץ קיים
async function fileExists(path) {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

// קריאה מהקובץ כאשר הבוט מתחיל
client.on('ready', async () => {
  console.log("OrBabor Bot is online");
  client.user.setActivity("OrBabor is the best server");

  // בדיקה אם הקובץ קיים וטעינת ההצעות
  if (await fileExists(path)) {
    await loadSuggestions();
  } else {
    console.log("Suggestions file does not exist, starting fresh.");
  }

  // יצירת פקודות סלש
  await client.application.commands.create(
    new SlashCommandBuilder()
      .setName('accept')
      .setDescription('מאשר הצעה')
      .addStringOption(option =>
        option.setName('messageid')
          .setDescription('הקש את המספר של ההודעה')
          .setRequired(true))
  );

  await client.application.commands.create(
    new SlashCommandBuilder()
      .setName('deny')
      .setDescription('דוחה הצעה')
      .addStringOption(option =>
        option.setName('messageid')
          .setDescription('הקש את המספר של ההודעה')
          .setRequired(true))
  );

  // הוספת פקודת משוב
  await client.application.commands.create(
    new SlashCommandBuilder()
      .setName('feedback')
      .setDescription('שלח משוב')
      .addStringOption(option =>
        option.setName('message')
          .setDescription('הקש את המשוב שלך')
          .setRequired(true))
  );

  // הוספת פקודת ניקוי
  await client.application.commands.create(
    new SlashCommandBuilder()
      .setName('clear')
      .setDescription('נקה מספר הודעות מהערוץ')
      .addIntegerOption(option =>
        option.setName('amount')
          .setDescription('מספר ההודעות לנקות (עד 100)')
          .setRequired(true))
  );

  // יצירת פקודת דרופ
  await client.application.commands.create(
    new SlashCommandBuilder()
      .setName('drop')
      .setDescription('יוצר דרופ של פרס')
      .addStringOption(option =>
        option.setName('reward')
          .setDescription('הפרס שמקבלים')
          .setRequired(true))
  );

});

// שמירה לפני סיום (עבודה עם PM2)
process.on('SIGINT', async () => {
  await saveSuggestions();
  process.exit();
});

process.on('SIGTERM', async () => {
  await saveSuggestions();
  process.exit();
});

// טיפול בהודעות חדשות ותגובות צוות
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
  
    // טיפול בהצעות חדשות
    if (message.channel.name === '║הצעות「📖」' && !message.reference) {
      const suggestionEmbed = new EmbedBuilder()
        .setTitle('הצעות לשרת')
        .setColor("#FFD700")
        .addFields(
          { name: 'שם המציע', value: `<@${message.author.id}>`, inline: true },
          { name: 'הצעה', value: message.content, inline: false }
        )
        .setTimestamp();
  
      const sentMessage = await message.channel.send({ embeds: [suggestionEmbed] });
  
      suggestionsMap.set(sentMessage.id, {
        author: message.author.id,
        content: message.content,
        timestamp: message.createdTimestamp
      });
  
      await sentMessage.react('✅');
      await sentMessage.react('❌');
  
      message.delete();
    } 
    // טיפול בתגובות צוות
    else if (message.reference) {
      const member = await message.guild.members.fetch(message.author.id);
      const staffRole = message.guild.roles.cache.find(role => role.name === 'צוות');
  
      if (!staffRole || !member.roles.cache.has(staffRole.id)) return;
  
      const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
  
      if (repliedMessage && suggestionsMap.has(repliedMessage.id)) {
        const suggestionData = suggestionsMap.get(repliedMessage.id);
        
        // לוג לבדוק את ה-embed המקורי
        console.log('Original embed:', repliedMessage.embeds[0]);
  
        // שמירה על השדות הקיימים
        const updatedEmbed = new EmbedBuilder(repliedMessage.embeds[0])
          .addFields(
            { name: 'שם הצוות שהגיב', value: `<@${message.author.id}>`, inline: true },
            { name: 'תגובת הצוות', value: `${message.content}`, inline: false }
          );
  
        // עדכון ה-embed עם התגובה
        await repliedMessage.edit({ embeds: [updatedEmbed] });
  
        // לוג לאחר העדכון
        console.log('Updated embed:', updatedEmbed);
  
        message.delete();
      }
    }
  });
  

// טיפול באינטראקציות של פקודות סלש
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName, options } = interaction;

  // בדוק אם הפקודה היא 'clear'
  const staffRole = interaction.guild.roles.cache.find(role => role.name === 'צוות');
  
  if (commandName === 'clear') {
    if (!interaction.member.roles.cache.has(staffRole.id)) {
      return interaction.reply({ content: 'אין לך הרשאות להשתמש בפקודה זו.', ephemeral: true });
    }
  }

  if (commandName === 'feedback') {
    const feedbackMessage = options.getString('message');

    // טיפול בהודעות משוב
    const feedbackEmbed = new EmbedBuilder()
      .setTitle('משוב חדש')
      .setColor("#FFA500")
      .addFields(
        { name: 'משוב ממי:', value: `<@${interaction.user.id}>`, inline: true },
        { name: 'המשוב:', value: feedbackMessage, inline: false }
      )
      .setTimestamp();

    const feedbackChannel = interaction.guild.channels.cache.find(channel => channel.name === '💬-משוב');
    if (feedbackChannel) {
      await feedbackChannel.send({ embeds: [feedbackEmbed] });
      await interaction.reply({ content: 'המשוב שלך נשלח!', ephemeral: true });
    } else {
      await interaction.reply({ content: 'ערוץ המשוב לא קיים!', ephemeral: true });
    }
  }

  if (commandName === 'accept') {
    const messageId = options.getString('messageid');

    if (suggestionsMap.has(messageId)) {
        const suggestionData = suggestionsMap.get(messageId);
        const repliedMessage = await interaction.channel.messages.fetch(messageId); // מחפש את ההודעה
        const updatedEmbed = EmbedBuilder.from(repliedMessage.embeds[0]) // עכשיו גישה לאימבד
            .setColor('GREEN') // שינוי הצבע לירוק
            .addFields(
                { name: 'ההצעה אושרה על ידי:', value: `<@${interaction.user.id}>`, inline: true }
            );

        await repliedMessage.edit({ embeds: [updatedEmbed] });
        await interaction.reply({ content: 'ההצעה אושרה!', ephemeral: true });
    } else {
        await interaction.reply({ content: 'לא נמצאה הצעה עם המספר הזה.', ephemeral: true });
    }
}

if (commandName === 'deny') {
  const messageId = options.getString('messageid');

  if (suggestionsMap.has(messageId)) {
      const suggestionData = suggestionsMap.get(messageId);
      const repliedMessage = await interaction.channel.messages.fetch(messageId);
      const updatedEmbed = EmbedBuilder.from(repliedMessage.embeds[0])
          .setColor('#FF0000') // הגדרת הצבע לאדום טהור ובולט
          .addFields(
              { name: 'ההצעה נדחתה על ידי:', value: `<@${interaction.user.id}>`, inline: true }
          );

      await repliedMessage.edit({ embeds: [updatedEmbed] });
      await interaction.reply({ content: 'ההצעה נדחתה!', ephemeral: true });
  } else {
      await interaction.reply({ content: 'לא נמצאה הצעה עם המספר הזה.', ephemeral: true });
  }
}

  if (commandName === 'clear') {
    const amount = options.getInteger('amount');
    if (amount > 1000 || amount < 1) {
      return interaction.reply({ content: 'נא לספק מספר בין 1 ל-1000.', ephemeral: true });
    }

    await interaction.channel.bulkDelete(amount, true);
    await interaction.reply({ content: `ניקיתי ${amount} הודעות בהצלחה.`, ephemeral: true });
  }

  const claimedRewards = new Set(); // אובייקט לאחסון מי קיבל פרס

  if (commandName === 'drop') {
      const reward = options.getString('reward');
  
      // הכנת ה-embed המקורי עם הפרס
      const originalEmbed = new EmbedBuilder()
          .setTitle('דרופ חדש!')
          .setDescription(`פרס: ${reward}`)
          .setColor('#FFD700');
  
      // הכנת הכפתור עם ערך הפרס בתוך ה-CustomId
      const button = new ButtonBuilder()
          .setCustomId(`claim_reward_${reward}`) // כאן הוספנו את הפרס ל-CustomId
          .setLabel('לקבל את הפרס!')
          .setStyle(ButtonStyle.Primary);
  
      // הוספת הכפתור לשורה
      const row = new ActionRowBuilder()
          .addComponents(button);
  
      // הכנת ההודעות
      const countdownMessages = ['5', '4', '3', '2', '1'];
  
      // שליחת ההודעה הראשונה: "אתם מוכנים?"
      let countdownText = "אתם מוכנים?🎁\nבעוד ";
  
      await interaction.deferReply(); // הכרה באינטראקציה
      const countdownMessage = await interaction.editReply({ content: countdownText + countdownMessages.join(' שניות...\nבעוד ') + ' שניות...' });
  
      // לולאה שתשנה את ההודעה כל שנייה
      for (const message of countdownMessages) {
          countdownText = `אתם מוכנים?🎁\nבעוד ${message} שניות...`;
          await countdownMessage.edit({ content: countdownText });
          await new Promise(resolve => setTimeout(resolve, 1000)); // מחכים שנייה
      }
  
      // אחרי שהטיימר נגמר, נשלח את ה-embed מחובר להודעה האחרונה יחד עם הכפתור
      await countdownMessage.edit({ content: countdownText + '\n\n', embeds: [originalEmbed], components: [row] });
  }
  
  // טיפול באינטראקציה של לחיצה על הכפתור
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
  
    if (interaction.customId.startsWith('claim_reward_')) {
      const reward = interaction.customId.split('_')[2]; // חילוץ ערך הפרס מה-CustomId
  
     // אם מישהו כבר לחץ על הכפתור הזה, אל תאפשר לו לקבל את הפרס שוב
      if (claimedRewards.has(reward)) {
        await interaction.reply({ content: 'הפרס כבר נתפס על ידי מישהו אחר!', ephemeral: true });
        return;
      }
        // הוספת הפרס כאילו נתפס
      claimedRewards.add(reward);
    
      // שליחת הודעה בצ'אט שמציינת שהשחקן זכה, כולל תיוג המשתמש
      await interaction.channel.send(`🎉 כל הכבוד ${interaction.user.toString()}! זכית בפרס: ${reward}!`);
  
      // יצירת כפתור מעודכן - משנה את הצבע לירוק, את הטקסט ל"הפרס התקבל!" ומנטרל את הכפתור
      const updatedButton = new ButtonBuilder()
        .setCustomId('claim_reward')
        .setLabel('🎉 הפרס התקבל!')
        .setStyle(ButtonStyle.Success)
        .setDisabled(true);
  
      // יצירת שורה חדשה עם הכפתור המעודכן
      const updatedRow = new ActionRowBuilder()
        .addComponents(updatedButton);
  
      // עדכון ההודעה עם הכפתור המעודכן (ירוק ו-disabled)
      await interaction.update({ components: [updatedRow] });
    }
  });
  
  // Registering commands with the Discord API
  const rest = new REST({ version: '9' }).setToken(token);
  (async () => {
      try {
          await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
              body: commands,
          });
          console.log('Commands registered successfully!');
      } catch (error) {
          console.error(error);
      }
  })();
  
});


const messageCounts = new Map(); // מיפוי של ID של כל משתמש וערוץ למספר ההודעות שהוא שלח
const TIME_WINDOW = ms('1h'); // חלון הזמן (שעה במקרה הזה)
const MAX_MESSAGES = 49; // מספר ההודעות המקסימלי לפני שהבוט ישלח הודעה

// רשימה של ערוצים שבהם הבוט יעבוד
const allowedChannels = [
  '1258761406711599125', 
  '1267452539918614582', 
  '1278251375951613952', 
  '1289990569036349561', 
  '1286336942937608222', 
  '1289918148430139474'
]; // החלף ב-ID של הערוצים שברצונך לאפשר


client.on('messageCreate', message => {
    if (message.author.bot) return; // התעלמות מהודעות של בוטים
    
    // בדיקה אם הערוץ הנוכחי הוא ברשימה של ערוצים מותרים
    if (!allowedChannels.includes(message.channel.id)) return;

    const userId = message.author.id;
    const channelId = message.channel.id; // ה-ID של הערוץ
    const now = Date.now();
    const key = `${userId}-${channelId}`; // מפתח שמשלב את ID של המשתמש וערוץ

    if (!messageCounts.has(key)) {
        // אם זה המשתמש הראשון שמכניסים לערוץ הזה, יוצרים רשומה חדשה עבורו
        messageCounts.set(key, []);
    }

    const userMessages = messageCounts.get(key);

    // מסנן את ההודעות שנשלחו בפרק הזמן של השעה האחרונה
    const recentMessages = userMessages.filter(timestamp => now - timestamp < TIME_WINDOW);
    
    // עדכון הרשימה עם הודעת המשתמש החדשה
    recentMessages.push(now);
    messageCounts.set(key, recentMessages);

    // בדיקה אם המשתמש שלח יותר מ-50 הודעות בשעה האחרונה
    if (recentMessages.length > MAX_MESSAGES) {
        message.channel.send('שקט יא חופרים!!');
        messageCounts.set(key, []); // איפוס הספירה לאחר שליחת ההודעה
    }
});


// כניסה לבוט
client.login(token);