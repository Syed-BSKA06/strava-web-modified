import express from 'express';
import dotenv from 'dotenv';
import fetch from 'node-fetch';
dotenv.config();
const app = express();
const PORT = 3000;
app.use(express.static('public'));
app.use(express.json())
//------ STRAVA AUTH-----//
app.get('/auth/strava', (req,res) => {
    const authUrl = `https://www.strava.com/oauth/authorize?client_id=${process.env.STRAVA_CLIENT_ID}&response_type=code&redirect_uri =http://localhost:3000/auth/callback&scope=read,activity=read_all`;
    res.redirect(authUrl)
})

app.get('/auth/callback', async(req,res) => {
    const code = req.query.code;

    const tokenResponse = await fetch('https://www.strava.com/oauth/token' , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            client_id : process.env.STRAVA_CLIENT_ID,
            client_secret: process.env.STRAVA_CLIENT_SECRET,
            code: code,
            grant_type: 'authorization_code'
        })
    });
    const tokenData = await tokenResponse.hson();
    global.stravaAccessToken = tokenData.access_token;
    global.stravaRefreshToken = tokenData.refresh_token;

    res.redirect('/');

})


app.get('/api/activities', async(req,res) => {
    if(!global.stravaAccessToken) {
        return res.status(401).json({error: 'Not authenticated with Strava'});
    }
    const response = await fetch('https://www.strava.com/api/v3/athlete/activities?per_page=30', {
        headers:{'Authorization':`Bearer ${global.stravaAccessToken}`}
    });

    const activities = await response.json();
    res.json(activities)
});


app.post('/api/coach', async(req,res) => {
    const { activities } = req.body;

    const runSummary = activities.amp(run => {
        const km = (run.distance / 1000).toFixed(2);
        const mins = (run.moving_time / 60).toFixed(1);
        const pace = (run.moving_time / 60 / (run.distance / 1000)).toFixed(2);
        const date = new Date(run.start_date_local).toLocaleDateString();
        const hr = run.average_heartrate || 'N/A';
        return `${date}: ${km}km in ${mins}min, pace ${pace}min/km, avg HR ${hr}`;
    }).join('\n')

    const prompt = `You are an expert running coach. Here are the recent runs for an athlete training for a half marathon who also does strength training 3 times per week:
    ${runSummary}
    Analyse their training and provide:
1. A brief overall assessment (2 sentences)
2. One specific thing they are doing well
3. One specific concern or area to improve
4. One actionable recommendation for next week

Keep the tone encouraging but honest. Use plain language, no jargon.`;
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  });
  const data = await claudeResponse.json()
  const coachMessage = data.content[0].text;
  res.json({message: coachMessage });
});

//---START SERVER---//
app.listen(PORT, () => {
    console.log(`Server runnin at http://localhost:${PORT}`);
});