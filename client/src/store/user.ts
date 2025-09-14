import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "@/lib/http";
import type { User } from "@/types/user";

type St<T> = {
  items: T[];
  item: T | null;
  status: "idle" | "loading" | "succeeded" | "failed";
  error: string | null;
};

const initial: St<User> = {
  items: [],
  item: null,
  status: "idle",
  error: null,
};

export const fetchProfile = createAsyncThunk("user/fetchProfile", async () => {
  const { data } = await http.get("/auth/me");
  return data.data.user as User;
});

export const updateProfile = createAsyncThunk(
  "user/updateProfile",
  async (payload: Partial<User>) => {
    const { data } = await http.patch("/users/me", payload);
    return data.data.user as User;
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
      s.item = a.payload as User;
    });
    b.addCase(fetchProfile.rejected, (s, a) => {
      s.status = "failed";
      s.error = (a.error as any)?.message || "Failed to load";
    });
    b.addCase(updateProfile.fulfilled, (s, a) => {
      s.item = a.payload as User;
    });
  },
});

export default userSlice.reducer;
