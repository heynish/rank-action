/** @jsxImportSource frog/jsx */

import { Button, Frog } from 'frog'
import { devtools } from 'frog/dev'
import { neynar as hub_neynar } from 'frog/hubs'
import { neynar } from "frog/middlewares";
import { handle } from 'frog/next'
import { serveStatic } from 'frog/serve-static';
import { NeynarAPIClient } from "@neynar/nodejs-sdk";

const neynarClient = new NeynarAPIClient(`${process.env.NEYNAR_API_KEY}`);

const app = new Frog({
  assetsPath: "/",
  basePath: "/api",
  hub: hub_neynar({ apiKey: `${process.env.NEYNAR_API_KEY}` }),
});

// Uncomment to use Edge Runtime
// export const runtime = 'edge'

const neynarMiddleware = neynar({
  apiKey: `${process.env.NEYNAR_API_KEY}`,
  features: ['interactor', 'cast'],
})

const ADD_URL =
  "https://warpcast.com/~/add-cast-action?url=https://rank-action.vercel.app/api/rank-action";


app.frame('/', (c) => {
  return c.res({
    image: '/1.png',
    intents: [
      <Button.Link
        href={ADD_URL}
      >
        Add Global Rank
      </Button.Link>,
    ],
  })
})

const actionMetadata = {
  name: "Rank Action",
  icon: "lightbulb",
  description: "Retrieve global ranking for a user.",
  aboutUrl: "https://yourdomain.com/about-rank-action",
  action: {
    type: 'post'
  }
};

app.post('/rank-action', async (c) => {
  try {
    const body = await c.req.json();
    const result = await neynarClient.validateFrameAction(
      body.trustedData.messageBytes
    );

    const { users } = await neynarClient.fetchBulkUsers([
      Number(result.action.cast.author.fid),
    ]);

    if (!users) {
      return c.json({ message: "Error. Try Again." }, 500);
    }

    let message = `Count:${users[0].follower_count}`;

    return c.json({ message });
  } catch (e) {
    return c.json({ message: "Error. Try Again." }, 500);
  }
  /*  const username = c.req.param('username');
 
   const response = await fetch('https://graph.cast.k3l.io/scores/global/following/handles', {
     method: 'POST',
     headers: {
       'Accept': 'application/json',
       'Content-Type': 'application/json'
     },
     body: JSON.stringify([username])
   })
 
   if (!response.ok) {
     return c.json({ message: 'Failed to call Openrank API', metadata: actionMetadata }, 400);
   }
 
   const data = await response.json();
 
   // Combine the API response data with your metadata before returning
   return c.json({
     message: data,
     metadata: actionMetadata // Add the metadata to the response
   }); */
});


/* app.castAction("/rank-action", neynarMiddleware, async (c) => {

  if (c.verified) {
    //const fid = c.actionData.fid;
    const username = c.var.interactor?.displayName;

    const response = await fetch('https://graph.cast.k3l.io/scores/global/following/handles', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([username])
    })

    if (!response.ok) {
      return c.res({ message: 'Failed to call Openrank API' });
    }

    const data = await response.json()
    console.log('data', data);

    return c.res({ message: data });
  } else {
    return c.res({ message: "Unauthorized" });
  }
}); */

devtools(app, { serveStatic })

export const GET = handle(app)
export const POST = handle(app)
