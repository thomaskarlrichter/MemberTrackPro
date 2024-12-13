import { useMembers } from "@/hooks/use-members";
import MemberCard from "@/components/members/MemberCard";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function MembersPage() {
  const { members } = useMembers();
  const [search, setSearch] = useState("");

  const filteredMembers = members?.filter((member) =>
    member.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Members</h1>
        <div className="w-72">
          <Input
            placeholder="Search members..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredMembers?.map((member) => (
          <MemberCard key={member.id} member={member} />
        ))}
      </div>
    </div>
  );
}
