import numpy as np
import typing

class Quaternion:
    def __init__(self, x, y, z, w):
        self.x = x
        self.y = y
        self.z = z
        self.w = w

    def to_rotation_matrix(self):
        return np.array([
            [1 - 2 * (self.y * self.y + self.z * self.z), 2 * (self.x * self.y - self.z * self.w), 2 * (self.x * self.z + self.y * self.w)],
            [2 * (self.x * self.y + self.z * self.w), 1 - 2 * (self.x * self.x + self.z * self.z), 2 * (self.y * self.z - self.x * self.w)],
            [2 * (self.x * self.z - self.y * self.w), 2 * (self.y * self.z + self.x * self.w), 1 - 2 * (self.x * self.x + self.y * self.y)]
        ], dtype=float)

    def normalize(self):
        norm = np.sqrt(self.x**2 + self.y**2 + self.z**2 + self.w**2)
        self.x /= norm
        self.y /= norm
        self.z /= norm
        self.w /= norm
        return self

    def slerp_to(self, target, t):
        return slerp_quaternions(self, target, t)

def quaternion_from_tuple(q_tuple: typing.Tuple[float, float, float, float]) -> Quaternion:
    return Quaternion(q_tuple[0], q_tuple[1], q_tuple[2], q_tuple[3]).normalize()

def calculate_velocity_from_quaternion(quaternion: Quaternion, speed=10) -> typing.Tuple[float, float, float]:
    forward_direction = np.array([0, 0, -1], dtype=float)
    rotation_matrix = quaternion.to_rotation_matrix()
    rotated_direction = np.dot(rotation_matrix, forward_direction)
    rotated_direction /= np.linalg.norm(rotated_direction)
    return tuple(rotated_direction * speed)

def slerp_quaternions(q1: Quaternion, q2: Quaternion, t: float) -> Quaternion:
    dot_product = q1.x * q2.x + q1.y * q2.y + q1.z * q2.z + q1.w * q2.w
    if dot_product < 0.0:
        q2 = Quaternion(-q2.x, -q2.y, -q2.z, -q2.w)
        dot_product = -dot_product

    dot_product = np.clip(dot_product, -1.0, 1.0)
    theta_0 = np.arccos(dot_product)
    sin_theta_0 = np.sin(theta_0)

    if sin_theta_0 < 1e-6:
        return q1

    theta = theta_0 * t
    sin_theta = np.sin(theta)

    s1 = np.cos(theta) - dot_product * (sin_theta / sin_theta_0)
    s2 = sin_theta / sin_theta_0

    return Quaternion(
        s1 * q1.x + s2 * q2.x,
        s1 * q1.y + s2 * q2.y,
        s1 * q1.z + s2 * q2.z,
        s1 * q1.w + s2 * q2.w
    ).normalize()

def update_projectile(projectile: dict, target_position: typing.Tuple[float, float, float], max_turn_rate: float, speed: float, delta_time: float) -> dict:
    position = np.array(projectile['location'])
    rotation = quaternion_from_tuple(projectile['rotation'])

    # Step 1: Calculate the direction to the target and the target rotation
    target_direction = calculate_direction_vector(position, target_position)
    target_rotation = calculate_target_quaternion(rotation, target_direction)

    # Step 2: Smoothly rotate towards the target rotation
    new_rotation = rotation.slerp_to(target_rotation, max_turn_rate * delta_time)

    # Step 3: Calculate the forward velocity based on the new rotation
    new_velocity = calculate_velocity_from_quaternion(new_rotation, speed)
    position += np.array(new_velocity) * delta_time

    # Update the projectile's state
    projectile['location'] = tuple(position)
    projectile['rotation'] = (new_rotation.x, new_rotation.y, new_rotation.z, new_rotation.w)
    return projectile

# Helper functions
def calculate_direction_vector(start, target):
    direction = np.array(target) - np.array(start)
    return direction / np.linalg.norm(direction)

def calculate_target_quaternion(current_rotation, target_direction):
    forward = np.array([0, 0, -1], dtype=float)
    current_direction = np.dot(current_rotation.to_rotation_matrix(), forward)

    # Calculate axis of rotation
    axis = np.cross(current_direction, target_direction)
    if np.linalg.norm(axis) < 1e-6:
        return Quaternion(0, 0, 0, 1)  # No rotation needed

    axis /= np.linalg.norm(axis)
    angle = np.arccos(np.clip(np.dot(current_direction, target_direction), -1.0, 1.0))
    half_angle = angle / 2
    sin_half_angle = np.sin(half_angle)

    return Quaternion(
        axis[0] * sin_half_angle,
        axis[1] * sin_half_angle,
        axis[2] * sin_half_angle,
        np.cos(half_angle)
    ).normalize()
