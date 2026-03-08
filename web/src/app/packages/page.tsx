"use client";

import { useEffect, useState } from "react";
import { UserLayout } from "@/components/layout/user-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { creditApi } from "@/lib/api";

export default function PackagesPage() {
  const [packages, setPackages] = useState<Array<Record<string, unknown>>>([]);

  useEffect(() => {
    creditApi.packages().then(setPackages).catch(() => {});
  }, []);

  return (
    <UserLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold">Gói dịch vụ</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg) => (
            <Card key={pkg.id as number}>
              <CardHeader>
                <CardTitle>{pkg.name as string}</CardTitle>
                {pkg.badge ? <Badge variant="outline">{String(pkg.badge)}</Badge> : null}
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{(pkg.credit_amount as number).toLocaleString()}</div>
                <p className="text-muted-foreground">credits</p>
                {(pkg.bonus_credit as number) > 0 && (
                  <p className="text-green-600">+ {(pkg.bonus_credit as number).toLocaleString()} bonus</p>
                )}
                <p className="text-xl font-semibold mt-2">{(pkg.price as number).toLocaleString()} VND</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </UserLayout>
  );
}
