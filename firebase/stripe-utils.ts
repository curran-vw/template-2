import { addDoc, collection, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, auth, db } from "./firebase";

export const stripeUtils = {
  async getUserPlan() {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error("No user is currently signed in.");
      return "free";
    }

    await currentUser.getIdToken(true);
    const decodedToken = await currentUser.getIdTokenResult();
    const plan = decodedToken.claims.stripeRole;

    if (!plan) {
      return "free";
    } else return decodedToken.claims.stripeRole as string;
  },

  async getCheckoutUrl(priceId: string) {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("User is not authenticated");

    const checkoutSessionRef = collection(
      db,
      "customers",
      userId,
      "checkout_sessions",
    );

    const docRef = await addDoc(checkoutSessionRef, {
      price: priceId,
      success_url: window.location.origin,
      cancel_url: window.location.origin,
    });

    return new Promise<string>((resolve, reject) => {
      const unsubscribe = onSnapshot(docRef, (snap) => {
        const { error, url } = snap.data() as {
          error?: { message: string };
          url?: string;
        };
        if (error) {
          unsubscribe();
          reject(new Error(`An error occurred: ${error.message}`));
        }
        if (url) {
          unsubscribe();
          resolve(url);
        }
      });
    });
  },

  async getPortalUrl() {
    const user = auth.currentUser;

    let dataWithUrl: any;
    try {
      const functions = getFunctions(app, "us-central1");
      const functionRef = httpsCallable(
        functions,
        "ext-firestore-stripe-payments-createPortalLink",
      );
      const { data } = await functionRef({
        customerId: user?.uid,
        returnUrl: window.location.origin + "/dashboard",
      });

      // Add a type to the data
      dataWithUrl = data as { url: string };
    } catch (error) {
      console.error(error);
    }

    return new Promise<string>((resolve, reject) => {
      if (dataWithUrl.url) {
        resolve(dataWithUrl.url);
      } else {
        reject(new Error("No url returned"));
      }
    });
  },
};
