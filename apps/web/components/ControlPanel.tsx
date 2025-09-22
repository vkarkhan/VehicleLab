"use client";

import { useId } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { SandboxState } from "@/lib/stateSchema";
import { roundTo } from "@/lib/utils";

interface ControlPanelProps {
  state: SandboxState;
  onChange: (state: Partial<SandboxState>) => void;
}

export function ControlPanel({ state, onChange }: ControlPanelProps) {
  const baseId = useId();

  const control = <K extends keyof SandboxState>(key: K, value: SandboxState[K]) => onChange({ [key]: value } as Partial<SandboxState>);

  return (
    <div className="space-y-8 rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Vehicle setup</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Tune mass, grip, and weight distribution to explore handling balance.</p>
      </div>

      <div className="space-y-5">
        <div>
          <Label htmlFor={`${baseId}-mass`}>Mass (kg)</Label>
          <div className="mt-2 flex items-center gap-3">
            <Slider
              value={[state.mass]}
              min={600}
              max={2200}
              step={10}
              onValueChange={([value]) => control("mass", value)}
            />
            <Input
              id={`${baseId}-mass`}
              type="number"
              min={600}
              max={2200}
              value={Math.round(state.mass)}
              onChange={(event) => control("mass", Number(event.target.value))}
              className="w-24"
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`${baseId}-cg`}>Centre of gravity height (m)</Label>
          <div className="mt-2 flex items-center gap-3">
            <Slider
              value={[state.cgHeight]}
              min={0.3}
              max={0.9}
              step={0.01}
              onValueChange={([value]) => control("cgHeight", value)}
            />
            <Input
              id={`${baseId}-cg`}
              type="number"
              step="0.01"
              min={0.3}
              max={0.9}
              value={roundTo(state.cgHeight, 2)}
              onChange={(event) => control("cgHeight", Number(event.target.value))}
              className="w-24"
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`${baseId}-weight`}>Front weight distribution (%)</Label>
          <div className="mt-2 flex items-center gap-3">
            <Slider
              value={[state.weightDistributionFront * 100]}
              min={35}
              max={65}
              step={1}
              onValueChange={([value]) => control("weightDistributionFront", value / 100)}
            />
            <Input
              id={`${baseId}-weight`}
              type="number"
              min={35}
              max={65}
              value={Math.round(state.weightDistributionFront * 100)}
              onChange={(event) => control("weightDistributionFront", Number(event.target.value) / 100)}
              className="w-24"
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`${baseId}-grip`}>Tyre grip (mu)</Label>
          <div className="mt-2 flex items-center gap-3">
            <Slider
              value={[state.tyreGrip]}
              min={0.5}
              max={1.5}
              step={0.01}
              onValueChange={([value]) => control("tyreGrip", value)}
            />
            <Input
              id={`${baseId}-grip`}
              type="number"
              step="0.01"
              min={0.5}
              max={1.5}
              value={roundTo(state.tyreGrip, 2)}
              onChange={(event) => control("tyreGrip", Number(event.target.value))}
              className="w-24"
            />
          </div>
        </div>
        <div>
          <Label htmlFor={`${baseId}-speed`}>Speed (km/h)</Label>
          <div className="mt-2 flex items-center gap-3">
            <Slider
              value={[state.speed]}
              min={0}
              max={200}
              step={1}
              onValueChange={([value]) => control("speed", value)}
            />
            <Input
              id={`${baseId}-speed`}
              type="number"
              min={0}
              max={200}
              value={Math.round(state.speed)}
              onChange={(event) => control("speed", Number(event.target.value))}
              className="w-24"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Steering input</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">Switch between step and sine inputs to stress the chassis.</p>
          </div>
          <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold uppercase text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Manoeuvre
          </span>
        </div>
        <Tabs value={state.steeringMode} onValueChange={(value) => control("steeringMode", value as SandboxState["steeringMode"])}>
          <TabsList>
            <TabsTrigger value="step">Step</TabsTrigger>
            <TabsTrigger value="sine">Sine</TabsTrigger>
          </TabsList>
          <TabsContent value="step" className="border-none bg-transparent p-0">
            <Label htmlFor={`${baseId}-amplitude`}>Steering amplitude (deg)</Label>
            <div className="mt-2 flex items-center gap-3">
              <Slider
                value={[state.steeringAmplitude]}
                min={2}
                max={20}
                step={0.5}
                onValueChange={([value]) => control("steeringAmplitude", value)}
              />
              <Input
                id={`${baseId}-amplitude`}
                type="number"
                min={2}
                max={20}
                step="0.5"
                value={roundTo(state.steeringAmplitude, 1)}
                onChange={(event) => control("steeringAmplitude", Number(event.target.value))}
                className="w-24"
              />
            </div>
          </TabsContent>
          <TabsContent value="sine" className="border-none bg-transparent p-0">
            <div className="space-y-4">
              <div>
                <Label htmlFor={`${baseId}-amp-sine`}>Amplitude (deg)</Label>
                <div className="mt-2 flex items-center gap-3">
                  <Slider
                    value={[state.steeringAmplitude]}
                    min={2}
                    max={25}
                    step={0.5}
                    onValueChange={([value]) => control("steeringAmplitude", value)}
                  />
                  <Input
                    id={`${baseId}-amp-sine`}
                    type="number"
                    min={2}
                    max={25}
                    step="0.5"
                    value={roundTo(state.steeringAmplitude, 1)}
                    onChange={(event) => control("steeringAmplitude", Number(event.target.value))}
                    className="w-24"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor={`${baseId}-frequency`}>Frequency (Hz)</Label>
                <div className="mt-2 flex items-center gap-3">
                  <Slider
                    value={[state.sineFrequency]}
                    min={0.1}
                    max={1.5}
                    step={0.05}
                    onValueChange={([value]) => control("sineFrequency", value)}
                  />
                  <Input
                    id={`${baseId}-frequency`}
                    type="number"
                    min={0.1}
                    max={1.5}
                    step="0.05"
                    value={roundTo(state.sineFrequency, 2)}
                    onChange={(event) => control("sineFrequency", Number(event.target.value))}
                    className="w-24"
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Scenario</h3>
        <Tabs value={state.manoeuvre} onValueChange={(value) => control("manoeuvre", value as SandboxState["manoeuvre"])}>
          <TabsList>
            <TabsTrigger value="skidpad">Skidpad</TabsTrigger>
            <TabsTrigger value="lane-change">Lane change</TabsTrigger>
          </TabsList>
          <TabsContent value="skidpad" className="border-none bg-transparent p-0">
            <Label htmlFor={`${baseId}-radius`}>Skidpad radius (m)</Label>
            <div className="mt-2 flex items-center gap-3">
              <Slider
                value={[state.skidpadRadius]}
                min={10}
                max={60}
                step={1}
                onValueChange={([value]) => control("skidpadRadius", value)}
              />
              <Input
                id={`${baseId}-radius`}
                type="number"
                min={10}
                max={60}
                value={Math.round(state.skidpadRadius)}
                onChange={(event) => control("skidpadRadius", Number(event.target.value))}
                className="w-24"
              />
            </div>
          </TabsContent>
          <TabsContent value="lane-change" className="border-none bg-transparent p-0">
            <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              A prebaked double-lane-change steering trace is used to stress the chassis.
            </p>
          </TabsContent>
        </Tabs>
        <div>
          <Label htmlFor={`${baseId}-duration`}>Simulation window (s)</Label>
          <div className="mt-2 flex items-center gap-3">
            <Slider
              value={[state.duration]}
              min={4}
              max={20}
              step={1}
              onValueChange={([value]) => control("duration", value)}
            />
            <Input
              id={`${baseId}-duration`}
              type="number"
              min={4}
              max={20}
              value={Math.round(state.duration)}
              onChange={(event) => control("duration", Number(event.target.value))}
              className="w-24"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Display</h3>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/60 p-4 shadow-inner dark:border-slate-800 dark:bg-slate-900/40">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-white">Show track & contact patches</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Toggle the asphalt plane and wheel footprints in the 3D sandbox.</p>
          </div>
          <Switch
            checked={state.showTrack}
            onCheckedChange={(value) => control("showTrack", value)}
            aria-label="Toggle track and contact patches"
          />
        </div>
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/60 p-5 shadow-inner dark:border-slate-800 dark:bg-slate-900/40">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">Alignment debug</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Reveal wheel centres and the ground reference to verify placement.</p>
            </div>
            <Switch
              checked={state.alignmentDebug}
              onCheckedChange={(value) => control("alignmentDebug", value)}
              aria-label="Toggle alignment debug helpers"
            />
          </div>
          <div className="grid gap-4">
            <div>
              <Label htmlFor={`${baseId}-wheel-radius`}>Wheel radius (m)</Label>
              <div className="mt-2 flex items-center gap-3">
                <Slider
                  value={[state.wheelRadiusMeters]}
                  min={0.25}
                  max={0.45}
                  step={0.005}
                  onValueChange={([value]) => control("wheelRadiusMeters", roundTo(value, 3))}
                  aria-label="Wheel radius in metres"
                />
                <Input
                  id={`${baseId}-wheel-radius`}
                  type="number"
                  inputMode="decimal"
                  min={0.25}
                  max={0.45}
                  step="0.001"
                  value={state.wheelRadiusMeters.toFixed(3)}
                  onChange={(event) => control("wheelRadiusMeters", Number(event.target.value))}
                  className="w-24"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`${baseId}-ride-height`}>Ride height (m)</Label>
              <div className="mt-2 flex items-center gap-3">
                <Slider
                  value={[state.rideHeightMeters]}
                  min={0}
                  max={0.4}
                  step={0.005}
                  onValueChange={([value]) => control("rideHeightMeters", roundTo(value, 3))}
                  aria-label="Ride height in metres"
                />
                <Input
                  id={`${baseId}-ride-height`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  max={0.4}
                  step="0.001"
                  value={state.rideHeightMeters.toFixed(3)}
                  onChange={(event) => control("rideHeightMeters", Number(event.target.value))}
                  className="w-24"
                />
              </div>
            </div>
            <div>
              <Label htmlFor={`${baseId}-origin-offset`}>Model origin offset (m)</Label>
              <div className="mt-2 flex items-center gap-3">
                <Slider
                  value={[state.modelOriginOffsetY]}
                  min={-0.3}
                  max={0.3}
                  step={0.005}
                  onValueChange={([value]) => control("modelOriginOffsetY", roundTo(value, 3))}
                  aria-label="Model origin offset"
                />
                <Input
                  id={`${baseId}-origin-offset`}
                  type="number"
                  inputMode="decimal"
                  min={-0.3}
                  max={0.3}
                  step="0.001"
                  value={state.modelOriginOffsetY.toFixed(3)}
                  onChange={(event) => control("modelOriginOffsetY", Number(event.target.value))}
                  className="w-24"
                />
              </div>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={`${baseId}-visual-camber`}>Camber (deg)</Label>
              <div className="mt-2 flex items-center gap-3">
                <Slider
                  value={[state.visualCamberDeg]}
                  min={-5}
                  max={5}
                  step={0.1}
                  onValueChange={([value]) => control("visualCamberDeg", roundTo(value, 1))}
                  aria-label="Visual camber angle"
                />
                <div className="w-16 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {roundTo(state.visualCamberDeg, 1)}°
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor={`${baseId}-visual-crown`}>Crown (deg)</Label>
              <div className="mt-2 flex items-center gap-3">
                <Slider
                  value={[state.visualCrownDeg]}
                  min={-3}
                  max={3}
                  step={0.1}
                  onValueChange={([value]) => control("visualCrownDeg", roundTo(value, 1))}
                  aria-label="Visual crown angle"
                />
                <div className="w-16 text-right text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {roundTo(state.visualCrownDeg, 1)}°
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Advanced suspension</h3>
          <span className="rounded-full bg-brand-500/10 px-3 py-1 text-xs font-semibold uppercase text-brand-600 dark:text-brand-300">
            Beta
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Camber, spring, damper, and anti-roll tuning are part of the Pro roadmap. Values are shown for reference.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`${baseId}-camber`}>Static camber (deg)</Label>
            <Input id={`${baseId}-camber`} value={roundTo(state.camber, 1)} readOnly className="opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${baseId}-spring`}>Spring rate (N/mm)</Label>
            <Input id={`${baseId}-spring`} value={Math.round(state.springRate)} readOnly className="opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${baseId}-damper`}>Damper (Ns/m)</Label>
            <Input id={`${baseId}-damper`} value={Math.round(state.damper)} readOnly className="opacity-60" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${baseId}-arb`}>Anti-roll balance</Label>
            <Input id={`${baseId}-arb`} value={roundTo(state.antiRoll, 2)} readOnly className="opacity-60" />
          </div>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Upgrade to VehicleLab Pro to unlock editing and preset sharing for these settings.
        </p>
      </div>
    </div>
  );
}
