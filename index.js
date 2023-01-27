import PushMeSDK, { Consts } from "@pushme-tgxn/pushmesdk";

import { CronJob } from "cron";
import axios from "axios";
import moment from "moment";

import { JobDefs } from "./config.js";

// get top post from subreddits

const getTopPostsSub = async (subreddit) => {
  try {
    const response = await axios.get(
      `https://old.reddit.com/r/${subreddit}/top/.json?sort=top&t=day`
    );
    return response.data.data.children;
  } catch (error) {
    console.error(error);
  }
};

const getTopPostsMulti = async (user, multiName) => {
  try {
    const requestUrl = `https://reddit.com/user/${user}/m/${multiName}/top/.json?sort=top&t=day`;
    console.log(requestUrl);
    const response = await axios.get(requestUrl);
    return response.data.data.children;
  } catch (error) {
    console.error(error);
  }
};

// send push notifications

async function sendLinkPush(client, secret, pushRequest) {
  console.log("Sending push notification", pushRequest);
  try {
    const { pushIdent } = await client.push.pushToTopic(secret, pushRequest);
    console.log(`Created Push Ident: ${pushIdent}`);
  } catch (error) {
    console.error(error.toString());
  }
}

async function runJob(jobDef) {
  let topPosts = null;
  if (jobDef.type === "sub") {
    topPosts = await getTopPostsSub(jobDef.sub);
  } else if (jobDef.type === "multi") {
    topPosts = await getTopPostsMulti(jobDef.user, jobDef.multi);
  }

  let topPost = null;
  for (const post of topPosts) {
    const testPostData = post.data;
    // console.log(testPostData);

    // tests for valid post (image, video, etc)

    // return the first one
    topPost = testPostData;
    break;
  }

  const pushmeClient = new PushMeSDK({
    backendUrl: jobDef.backendUrl || Consts.BACKEND_URL,
  });

  // which link to send (comments vs. direct link)
  const linkUrl = `https://old.reddit.com/${topPost.subreddit_name_prefixed}/comments/${topPost.id}/`;
  console.log(linkUrl);

  const dateString = moment().format("MMM Do");

  const pushRequest = {
    categoryId: Consts.PushCategory.BUTTON_OPEN_LINK,
    title: `What's the story for ${dateString}?`,
    body: `Top post is from ${topPost.subreddit_name_prefixed} with ${topPost.ups} upvotes.`,
    data: {
      linkUrl,
      // openInstanced: true,
      // sendReceipt: true,
    },
  };

  // send to all tokens
  for (const token of jobDef.sendtokens) {
    await sendLinkPush(pushmeClient, token, pushRequest);
  }
}

async function run() {
  for (const jobDef of JobDefs) {
    const cronSchedule = jobDef.schedule || "*/1 * * * *";
    const timeZone = jobDef.timezone || "Australia/Perth";

    console.log(`Scheduling cron job for ${cronSchedule} in ${timeZone}...`);
    new CronJob(cronSchedule, () => runJob(jobDef), null, true, timeZone);
  }
}

run();
