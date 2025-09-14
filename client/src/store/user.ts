import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { http } from "@/lib/http";
import { toItem, toErrorMessage } from "@/lib/response";
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

export const fetchProfile = createAsyncThunk(
  "user/fetchProfile",
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await http.get("/auth/me");
      return toItem(res) as User;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
  }
);

export const updateProfile = createAsyncThunk(
  "user/updateProfile",
  async (payload: Partial<User>, { rejectWithValue }) => {
    try {
      const res = await http.patch("/users/me", payload);
      return toItem(res) as User;
    } catch (err) {
      return rejectWithValue(toErrorMessage(err));
    }
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
      s.error = (a.payload as string) || (a.error as any)?.message || "Failed to load";
    });
    b.addCase(updateProfile.fulfilled, (s, a) => {
      s.item = a.payload as User;
    });
  },
});

export default userSlice.reducer;
