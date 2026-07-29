"use client"

import { motion } from "framer-motion"
import { Bell, User } from "lucide-react"

export default function Navbar() {
  return (
    <header
      className="
      w-full
      h-16
      flex
      items-center
      justify-between
      px-6
      bg-white
      border-b
      border-gray-200
      shadow-sm
    "
    >
      <h1 className="text-lg font-semibold text-[#12343b]">
        Land Record Management
      </h1>

      <div className="flex items-center gap-4">
        <motion.button
          whileHover={{ scale: 1.1 }}
          className="
            p-2
            rounded-full
            hover:bg-gray-100
            transition
          "
        >
          <Bell size={20} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          className="
            flex
            items-center
            gap-2
            bg-[#e1b382]
            text-[#12343b]
            px-3
            py-1.5
            rounded-lg
            shadow-md
            hover:bg-[#c89666]
            transition
          "
        >
          <User size={18} />
          Admin
        </motion.button>
      </div>
    </header>
  )
}