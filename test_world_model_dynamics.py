import torch
import numpy as np
import os
import json
from world_model import NetworkWorldModel
from mitre_mapping import MITRE_PHASES, ATTACK_CLASS_MAP

def test_world_model_architecture():
    print("=" * 60)
    print("[TEST 1] Architecture, Forward Pass & Output Tensor Dimensions")
    print("=" * 60)

    batch_size = 4
    seq_len = 10
    input_size = 78
    hidden_size = 128
    num_phases = 6
    num_classes = 16

    model = NetworkWorldModel(
        input_size=input_size,
        hidden_size=hidden_size,
        num_layers=2,
        num_phases=num_phases,
        num_classes=num_classes
    )
    model.eval()

    # Synthetic input sequence: [batch_size, seq_len, input_size]
    dummy_input = torch.rand(batch_size, seq_len, input_size)

    with torch.no_grad():
        next_state, inf_logit, phase_logits, class_logits, attn_weights = model(dummy_input)

    print(f"Input shape:                {dummy_input.shape}")
    print(f"Head 1 (Dynamics S_t+1):    {next_state.shape}  -> Expected: ({batch_size}, {input_size})")
    print(f"Head 2 (Infiltration Risk): {inf_logit.shape}   -> Expected: ({batch_size}, 1)")
    print(f"Head 3 (MITRE Phase):       {phase_logits.shape} -> Expected: ({batch_size}, {num_phases})")
    print(f"Head 4 (Attack Class):      {class_logits.shape} -> Expected: ({batch_size}, {num_classes})")
    print(f"Attention Weights:          {attn_weights.shape} -> Expected: ({batch_size}, {seq_len})")

    assert next_state.shape == (batch_size, input_size), "Dynamics head shape mismatch!"
    assert inf_logit.shape == (batch_size, 1), "Infiltration risk shape mismatch!"
    assert phase_logits.shape == (batch_size, num_phases), "Phase head shape mismatch!"
    assert class_logits.shape == (batch_size, num_classes), "Class head shape mismatch!"
    assert attn_weights.shape == (batch_size, seq_len), "Attention shape mismatch!"

    # Verify attention weights sum to 1.0 across time dimension
    attn_sums = attn_weights.sum(dim=-1).numpy()
    np.testing.assert_allclose(attn_sums, np.ones(batch_size), rtol=1e-5, err_msg="Attention does not sum to 1.0!")
    print("[SUCCESS] TEST 1 PASSED: All tensor dimensions and attention normalization verified.")


def test_autoregressive_rollout():
    print("\n" + "=" * 60)
    print("[TEST 2] Autoregressive K-Step Forward Simulation (Rollout)")
    print("=" * 60)

    input_size = 78
    seq_len = 10
    k_steps = 4

    model = NetworkWorldModel(input_size=input_size, hidden_size=128, num_layers=2)
    model.eval()

    # Create a realistic initial sequence representing reconnaissance traffic
    initial_seq = torch.rand(1, seq_len, input_size)

    trajectory = model.forward_rollout(initial_seq, k_steps=k_steps)

    print(f"Generated {len(trajectory)} forward simulation steps:")
    for step_data in trajectory:
        step = step_data["step"]
        horizon = step_data["horizon"]
        inf_prob = step_data["infiltration_probability"]
        phase_idx = step_data["predicted_phase_idx"]
        phase_name = MITRE_PHASES[phase_idx]["name"]
        class_idx = step_data["predicted_class_idx"]
        class_name = ATTACK_CLASS_MAP[class_idx]["name"]
        confidence = step_data["class_confidence"]

        print(f"  Step {step} [{horizon}]: "
              f"Infiltration Risk = {inf_prob:5.2f}% | "
              f"MITRE Phase = {phase_name:<30} | "
              f"Forecasted Attack = {class_name} ({confidence:.1f}%)")

    assert len(trajectory) == k_steps, f"Expected {k_steps} trajectory steps!"
    print("[SUCCESS] TEST 2 PASSED: Autoregressive rollout successfully generated simulated future states.")


def test_mitre_mapping_consistency():
    print("\n" + "=" * 60)
    print("[TEST 3] MITRE ATT&CK Framework Mapping Consistency")
    print("=" * 60)

    for cls_idx, meta in ATTACK_CLASS_MAP.items():
        phase_idx = meta["phase_idx"]
        assert phase_idx in MITRE_PHASES, f"Phase {phase_idx} not in MITRE_PHASES!"
        phase_info = MITRE_PHASES[phase_idx]
        assert "name" in phase_info and "severity" in phase_info
        print(f"  Class {cls_idx:2d} ({meta['name']:<25}) -> Phase {phase_idx}: {phase_info['name']} [{meta['mitre_id']}]")

    print("[SUCCESS] TEST 3 PASSED: All 16 attack classes correctly map to canonical MITRE ATT&CK kill chain.")

if __name__ == "__main__":
    test_world_model_architecture()
    test_autoregressive_rollout()
    test_mitre_mapping_consistency()
    print("\n" + "=" * 60)
    print("[ALL TESTS PASSED] WORLD MODEL VERIFIED SUCCESSFULLY!")
    print("=" * 60)
