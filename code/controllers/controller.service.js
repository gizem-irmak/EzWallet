import { Group } from "../models/User";
import { verifyAuth } from "./utils";

export const ensureGroupExistsAndVerify = async (name, req, res) => {
  const group = await Group.findOne({ name });
  if (!group) return { cause: 'Group not found', verified: false };

  let auth;
  if (req.url.indexOf("/transactions/groups/") >= 0) {
    // called by admin
    auth = verifyAuth(req, res, { authType: 'Admin' });
    if (!auth.authorized) return { verified: false, auth };
  } else {
    // called by user - first verify regular.
    // TODO: remove?
    // auth = verifyAuth(req, res, { authType: 'Simple' });
    // if (!auth.authorized) return { verified: false, auth };

    // and then group
    auth = verifyAuth(req, res, { authType: 'Group', emails: group.members.map(m => m.email) });
    if (!auth.authorized) return { verified: false, auth, };
  }

  return { group, verified: true, auth, };
}

export const composeTxAggregation = (filter = null) => [
  ...(filter ? [{ $match: filter }] : []),
  {
    $lookup: {
      from: "categories",
      localField: "type",
      foreignField: "type",
      as: "categories_info"
    }
  },
  { $unwind: "$categories_info" },
  { $sort: { date: -1 } }
]