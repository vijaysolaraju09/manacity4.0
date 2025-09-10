import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "@/lib/http";

export interface UserProfile {
  _id: string;
  name: string;
  phone?: string;
  location?: string;
  role?: string;
  avatar?: string;
}

type St<T> = {
  items: T[];
  item: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initial: St<UserProfile> = {
  items: [],
  item: null,
  status: "idle",
  error: null,
};

export const fetchProfile = createAsyncThunk("user/fetchProfile", async () => {
  const { data } = await api.get("/profile");
  return data;
});

export const updateProfile = createAsyncThunk(
  "user/updateProfile",
  async (payload: Partial<UserProfile>) => {
    const { data } = await api.put("/profile", payload);
    return data;
  }
);

const userSlice = createSlice({
  name: "userProfile",
  initialState: initial,
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchProfile.pending, (s) => {
      s.status = "loading";
      s.error = null;
    });
    b.addCase(fetchProfile.fulfilled, (s, a) => {
      s.status = "succeeded";
      s.item = a.payload as UserProfile;
    });
    b.addCase(fetchProfile.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.error as any)?.message || "Failed to load";
    });
    b.addCase(updateProfile.fulfilled, (s, a) => {
      s.item = a.payload as UserProfile;
    });
  },
});

export default userSlice.reducer;
